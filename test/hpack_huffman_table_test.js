var expect = require('chai').expect;
var HpackConstants = require('../lib/hpack_constants')
var HpackHuffmanTable = require('../lib/hpack_huffman_table')

var bits = function(bitstring) {
  return parseInt(bitstring, 2);
};

var HpackHuffmanSymbol = HpackConstants.HpackHuffmanSymbol;

describe('HpackHuffmanTableTest', function() {
  it('InitializeHpackCode', function() {
    var code = HpackConstants.HpackHuffmanCode();
    var table_ = new HpackHuffmanTable();
    expect(table_.Initialize(code)).to.equal(true);
    expect(table_.IsInitialized()).to.equal(true);
    expect(table_.pad_bits_).to.equal(bits("11111111"));
  });
});

describe('HpackHuffmanTableTest', function() {
  it('InitializeEdgeCases', function() {
    {
      var code = [
        {code: "00000000000000000000000000000000", length: 3, id: 0},
        {code: "00100000000000000000000000000000", length: 3, id: 1},
        {code: "01000000000000000000000000000000", length: 3, id: 2},
        {code: "01100000000000000000000000000000", length: 3, id: 3},
        {code: "10000000000000000000000000000000", length: 3, id: 4},
        {code: "10100000000000000000000000000000", length: 3, id: 5},
        {code: "11000000000000000000000000000000", length: 3, id: 6},
        {code: "11100000000000000000000000000000", length: 8, id: 7}
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(true);
    }

    {
      var code = [
        {code: "00000000000000000000000000000000", length: 1, id: 0},
        {code: "10000000000000000000000000000000", length: 2, id: 1},
        {code: "11000000000000000000000000000000", length: 3, id: 2},
        {code: "11100000000000000000000000000000", length: 8, id: 3}
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(true);
    }

    {
      var code = [
        {code: "00000000000000000000000000000000", length: 1, id: 0},
        {code: "10000000000000000000000000000000", length: 2, id: 1},
        {code: "11000000000000000000000000000000", length: 2, id: 2},
        {code: "00000000000000000000000000000000", length: 8, id: 3}  // Overflow.
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(false);
      expect(table_.failed_symbol_id_).to.equal(3);
    }

    {
      var code = [
        {code: "00000000000000000000000000000000", length: 1, id: 0},
        {code: "10000000000000000000000000000000", length: 2, id: 1},
        {code: "11000000000000000000000000000000", length: 3, id: 1},  // Repeat.
        {code: "11100000000000000000000000000000", length: 8, id: 3}
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(false);
      expect(table_.failed_symbol_id_).to.equal(2);
    }

    {
      var code = [
        {code: "10000000000000000000000000000000", length: 4, id: 0},
        {code: "10010000000000000000000000000000", length: 4, id: 1},
        {code: "10100000000000000000000000000000", length: 4, id: 2},
        {code: "10110000000000000000000000000000", length: 8, id: 3}
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(false);
      expect(table_.failed_symbol_id_).to.equal(0);
    }

    {
      var code = [
        {code: "00000000000000000000000000000000", length: 2, id: 0},
        {code: "01000000000000000000000000000000", length: 2, id: 1},
        {code: "11000000000000000000000000000000", length: 2, id: 2},  // Not canonical.
        {code: "10000000000000000000000000000000", length: 8, id: 3}
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(false);
      expect(table_.failed_symbol_id_).to.equal(2);
    }

    {
      var code = [
        {code: "00000000000000000000000000000000", length: 1, id: 0},
        {code: "10000000000000000000000000000000", length: 2, id: 1},
        {code: "11000000000000000000000000000000", length: 3, id: 2},
        {code: "11100000000000000000000000000000", length: 7, id: 3}
      ].map(function(hpackHuffmanSymbol) {
        return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
      });

      var table_ = new HpackHuffmanTable();
      expect(table_.Initialize(code)).to.equal(false);
    }
  });
});

describe('HpackHuffmanTableTest', function() {
  it('ValidateInternalsWithSmallCode', function() {
    var code = [
      {code: "01100000000000000000000000000000", length: 4, id: 0},  // 3rd.
      {code: "01110000000000000000000000000000", length: 4, id: 1},  // 4th.
      {code: "00000000000000000000000000000000", length: 2, id: 2},  // 1st assigned code.
      {code: "01000000000000000000000000000000", length: 3, id: 3},  // 2nd.
      {code: "10000000000000000000000000000000", length: 5, id: 4},  // 5th.
      {code: "10001000000000000000000000000000", length: 5, id: 5},  // 6th.
      {code: "10011000000000000000000000000000", length: 8, id: 6},  // 8th.
      {code: "10010000000000000000000000000000", length: 5, id: 7}  // 7th.
    ].map(function(hpackHuffmanSymbol) {
      return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
    });

    var table_ = new HpackHuffmanTable();
    expect(table_.Initialize(code)).to.equal(true);

    expect(table_.code_by_id()).to.eql([
      bits("01100000000000000000000000000000"),
      bits("01110000000000000000000000000000"),
      bits("00000000000000000000000000000000"),
      bits("01000000000000000000000000000000"),
      bits("10000000000000000000000000000000"),
      bits("10001000000000000000000000000000"),
      bits("10011000000000000000000000000000"),
      bits("10010000000000000000000000000000")
    ]);
    expect(table_.length_by_id()).to.eql(
      [4, 4, 2, 3, 5, 5, 8, 5]
    );
    expect(table_.decode_tables()).to.have.length(1);

    expect(table_.pad_bits_).to.equal(bits("10011000"));
  });
});

describe('HpackHuffmanTableTest', function() {
  it('ValidateMultiLevelDecodeTables', function() {
    var code = [
      {code: "00000000000000000000000000000000", length:  6, id: 0},
      {code: "00000100000000000000000000000000", length:  6, id: 1},
      {code: "00001000000000000000000000000000", length: 11, id: 2},
      {code: "00001000001000000000000000000000", length: 11, id: 3},
      {code: "00001000010000000000000000000000", length: 12, id: 4}
    ].map(function(hpackHuffmanSymbol) {
      return new HpackHuffmanSymbol(bits(hpackHuffmanSymbol.code), hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
    });

    var table_ = new HpackHuffmanTable();
    expect(table_.Initialize(code)).to.equal(true);

    expect(table_.decode_tables()).to.have.length(2);

    expect(table_.pad_bits_).to.equal(bits("00001000"));
  });
});
