var HpackConstants = require('./hpack_constants');

var DECODE_TABLE_ROOT_BITS = 9;
var DECODE_TABLE_BRANCH_BITS = 6;

var pad_bits_;
var failed_symbol_id_;

var code_by_id_;
var length_by_id_;

function symbolIdCompare(a, b) {
  return a.id - b.id
}

function symbolLengthIdCompare(a, b) {
  if (a.length === b.length) {
    return symbolIdCompare(a, b);
  }
  return a.length - b.length;
}

var DecodeTable = function(prefix_length, indexed_length, entries_offset) {
  this.prefix_length = (typeof prefix_length === 'undefined') ? 0 : prefix_length;
  this.indexed_length = (typeof indexed_length === 'undefined') ? 0 : indexed_length;
  this.entries_offset = (typeof entries_offset) ? 0 : entries_offset;
}

DecodeTable.prototype.size = function() {
  return ((1 << this.indexed_length) >>> 0);
}

var DecodeEntry = function(next_table_index, length, symbol_id) {
  this.next_table_index = (typeof next_table_index === 'undefined') ? 0 : next_table_index;
  this.length = (typeof length === 'undefined') ? 0 : length;
  this.symbol_id = (typeof symbol_id === 'undefined') ? 0 : symbol_id;
}

var decode_tables_;
var decode_entries_;

var HpackHuffmanTable = function() {
  this.failed_symbol_id_ = failed_symbol_id_;
  this.pad_bits_ = pad_bits_;
  code_by_id_ = [];
  length_by_id_ = [];
  decode_tables_ = [];
  decode_entries_ = [];
}

HpackHuffmanTable.prototype.Initialize = function(input_symbols) {
  var symbol_count = input_symbols.length;
  var symbols = new Array(symbol_count);
  for (i = 0; i != symbol_count; i++) {
    if (i != input_symbols[i].id) {
      this.failed_symbol_id_ = i;
      return false;
    }
    symbols[i] = input_symbols[i];
  }
  symbols.sort(symbolLengthIdCompare);
  if (symbols[0].code != 0) {
    this.failed_symbol_id_ = 0;
    return false;
  }
  for (i = 1, l = symbols.length; i != l; i++) {
    var code_shift = 32 - symbols[i-1].length;
    var code = symbols[i-1].code + ((1 << code_shift) >>> 0);

    if (code != symbols[i].code) {
      this.failed_symbol_id_ = symbols[i].id;
      return false;
    }
    if (code < symbols[i-1].code) {
      this.failed_symbol_id_ = symbols[i].id;
      return false;
    }
  }
  if (symbols[symbols.length - 1].length < 8) {
    return false;
  }
  this.pad_bits_ = (symbols[symbols.length - 1].code >>> 24);

  BuildDecodeTable(symbols);
  symbols.sort(symbolIdCompare);
  BuildEncodeTable(symbols);
  return true;
}

function BuildEncodeTable(symbols) {
  for (i = 0, l = symbols.length; i != l; i++) {
    var symbol = symbols[i];
    if (i != symbol.id) return false;
    code_by_id_.push(symbol.code);
    length_by_id_.push(symbol.length);
  }
}

function BuildDecodeTable(symbols) {
  AddDecodeTable(0, DECODE_TABLE_ROOT_BITS);
  symbols.reverse().forEach(function(it) {
    var table_index = 0;
    while(true) {
      decode_tables_[table_index] = decode_tables_[table_index] || new DecodeTable();
      table = decode_tables_[table_index];

      var index = ((it.code << table.prefix_length) >>> 0);
      index = index >>> (32 - table.indexed_length);
      if (index >= table.size()) return false;
      var entry = Entry(table, index);

      var total_indexed = table.prefix_length + table.indexed_length;
      if (total_indexed >= it.length) {
        entry.length = it.length;
        entry.symbol_id = it.id;
        entry.next_table_index = table_index;
        SetEntry(table, index, entry);
        break;
      }

      if (entry.length == 0) {
        if (entry.next_table_index != 0) return false;
        entry.length = it.length;
        entry.next_table_index = AddDecodeTable(
          total_indexed,
          Math.min(DECODE_TABLE_BRANCH_BITS, entry.length - total_indexed)
        );
        SetEntry(table, index, entry);
      }
      if (entry.next_table_index === table_index) return false;
      table_index = entry.next_table_index;
    }
  });

  for (var i = 0, l = decode_tables_.length; i != l; i++) {
    var table = decode_tables_[i] || new DacodeTable();
    total_indexed = table.prefix_length + table.indexed_length;

    var j = 0;
    while (j != table.size()) {
      var entry = Entry(table, j);
      if (entry.length != 0 && entry.length < total_indexed) {
        var fill_count = (1 << (total_indexed - entry.length) >>> 0);
        if (j + fill_count >= table.size()) return false;

        for (var k = 1; k != fill_count; k++) {
          if (Entry(table, j + k).length != 0) return false;
          SetEntry(table, j + k, entry);
        }
        j += fill_count;
      } else {
        j++;
      }
    }
  }
}

var AddDecodeTable = function(prefix, indexed) {
  if (decode_tables_.length >= 255) return false;
  var table = new DecodeTable();
  table.prefix_length = prefix;
  table.indexed_length = indexed;
  table.entries_offset = decode_entries_.length;
  decode_tables_.push(table);
  decode_entries_.length = decode_entries_.length + ((1 << indexed) >>> 0);
  return decode_tables_.length - 1;
}

var Entry = function(table, index) {
  if (index >= table.size()) return false;
  if (table.entries_offset + index >= decode_entries_.length) return false;
  decode_entries_[table.entries_offset + index] = decode_entries_[table.entries_offset + index] || new DecodeEntry();
  // console.log(decode_entries_);
  // console.log(decode_entries_[table.entries_offset + index]);
  return decode_entries_[table.entries_offset + index];
}

var SetEntry = function(table, index, entry) {
  if (index >= table.size()) return false;
  if (table.entries_offset + index >= decode_entries_.length) return false;
  decode_entries_[table.entries_offset + index] = entry;
}

HpackHuffmanTable.prototype.IsInitialized = function() {
  return code_by_id_.length !== 0;
}

HpackHuffmanTable.prototype.code_by_id = function() {
  return code_by_id_;
}

HpackHuffmanTable.prototype.length_by_id = function() {
  return length_by_id_;
}

HpackHuffmanTable.prototype.decode_tables = function() {
  return decode_tables_;
}

HpackHuffmanTable.prototype.decode_entries = function() {
  return decode_entries_;
}

module.exports = HpackHuffmanTable;

