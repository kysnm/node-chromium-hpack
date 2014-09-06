var HpackPrefix = function(bits, bit_size) {
  this.bits = bits;
  this.bit_size = bit_size;
};

var HpackHuffmanSymbol = function(code, length, id) {
  this.code = code;
  this.length = length;
  this.id = id;
};

var DEFAULT_HEADER_SIZE_SETTINGS = 4096;
var DEFAULT_MAX_STRING_LITERAL_SIZE = 16 * 1024
var MAX_DECODE_BUFFER_SIZE = 32 * 1024
var STRING_LITERAL_IDENTITY_ENCODED = new HpackPrefix(0x0, 1);
var STRING_LITERAL_HUFFMAN_ENCODED = new HpackPrefix(0x1, 1);
var INDEXED_OPECODE = new HpackPrefix(0x1, 1);
var LITERAL_INCREMENTAL_INDEX_OPECODE = new HpackPrefix(0x1, 2);
var LITERAL_NO_INDEX_OPECODE = new HpackPrefix(0x0, 4);
var LITERAL_NEVER_INDEX_OPECODE = new HpackPrefix(0x1, 4);
var ENCODING_CONTEXT_OPECODE = new HpackPrefix(0x1, 3);
var ENCODING_CONTEXT_EMPTY_REFERENCE_SET = new HpackPrefix(0x10, 5);
var ENCODING_CONTEXT_NEW_MAXIMUM_SIZE = new HpackPrefix(0x0, 1);

var HpackHuffmanCode = function() {
  return [
    {code: 0xffc00000, length: 13, id:   0},  //     11111111|11000
    {code: 0xffffb000, length: 23, id:   1},  //     11111111|11111111|1011000
    {code: 0xfffffe20, length: 28, id:   2},  //     11111111|11111111|11111110|0010
    {code: 0xfffffe30, length: 28, id:   3},  //     11111111|11111111|11111110|0011
    {code: 0xfffffe40, length: 28, id:   4},  //     11111111|11111111|11111110|0100
    {code: 0xfffffe50, length: 28, id:   5},  //     11111111|11111111|11111110|0101
    {code: 0xfffffe60, length: 28, id:   6},  //     11111111|11111111|11111110|0110
    {code: 0xfffffe70, length: 28, id:   7},  //     11111111|11111111|11111110|0111
    {code: 0xfffffe80, length: 28, id:   8},  //     11111111|11111111|11111110|1000
    {code: 0xffffea00, length: 24, id:   9},  //     11111111|11111111|11101010
    {code: 0xfffffff0, length: 30, id:  10},  //     11111111|11111111|11111111|111100
    {code: 0xfffffe90, length: 28, id:  11},  //     11111111|11111111|11111110|1001
    {code: 0xfffffea0, length: 28, id:  12},  //     11111111|11111111|11111110|1010
    {code: 0xfffffff4, length: 30, id:  13},  //     11111111|11111111|11111111|111101
    {code: 0xfffffeb0, length: 28, id:  14},  //     11111111|11111111|11111110|1011
    {code: 0xfffffec0, length: 28, id:  15},  //     11111111|11111111|11111110|1100
    {code: 0xfffffed0, length: 28, id:  16},  //     11111111|11111111|11111110|1101
    {code: 0xfffffee0, length: 28, id:  17},  //     11111111|11111111|11111110|1110
    {code: 0xfffffef0, length: 28, id:  18},  //     11111111|11111111|11111110|1111
    {code: 0xffffff00, length: 28, id:  19},  //     11111111|11111111|11111111|0000
    {code: 0xffffff10, length: 28, id:  20},  //     11111111|11111111|11111111|0001
    {code: 0xffffff20, length: 28, id:  21},  //     11111111|11111111|11111111|0010
    {code: 0xfffffff8, length: 30, id:  22},  //     11111111|11111111|11111111|111110
    {code: 0xffffff30, length: 28, id:  23},  //     11111111|11111111|11111111|0011
    {code: 0xffffff40, length: 28, id:  24},  //     11111111|11111111|11111111|0100
    {code: 0xffffff50, length: 28, id:  25},  //     11111111|11111111|11111111|0101
    {code: 0xffffff60, length: 28, id:  26},  //     11111111|11111111|11111111|0110
    {code: 0xffffff70, length: 28, id:  27},  //     11111111|11111111|11111111|0111
    {code: 0xffffff80, length: 28, id:  28},  //     11111111|11111111|11111111|1000
    {code: 0xffffff90, length: 28, id:  29},  //     11111111|11111111|11111111|1001
    {code: 0xffffffa0, length: 28, id:  30},  //     11111111|11111111|11111111|1010
    {code: 0xffffffb0, length: 28, id:  31},  //     11111111|11111111|11111111|1011
    {code: 0x50000000, length:  6, id:  32},  // ' ' 010100
    {code: 0xfe000000, length: 10, id:  33},  // '!' 11111110|00
    {code: 0xfe400000, length: 10, id:  34},  // '"' 11111110|01
    {code: 0xffa00000, length: 12, id:  35},  // '#' 11111111|1010
    {code: 0xffc80000, length: 13, id:  36},  // '$' 11111111|11001
    {code: 0x54000000, length:  6, id:  37},  // '%' 010101
    {code: 0xf8000000, length:  8, id:  38},  // '&' 11111000
    {code: 0xff400000, length: 11, id:  39},  // ''' 11111111|010
    {code: 0xfe800000, length: 10, id:  40},  // '(' 11111110|10
    {code: 0xfec00000, length: 10, id:  41},  // ')' 11111110|11
    {code: 0xf9000000, length:  8, id:  42},  // '*' 11111001
    {code: 0xff600000, length: 11, id:  43},  // '+' 11111111|011
    {code: 0xfa000000, length:  8, id:  44},  // ',' 11111010
    {code: 0x58000000, length:  6, id:  45},  // '-' 010110
    {code: 0x5c000000, length:  6, id:  46},  // '.' 010111
    {code: 0x60000000, length:  6, id:  47},  // '/' 011000
    {code: 0x00000000, length:  5, id:  48},  // '0' 00000
    {code: 0x08000000, length:  5, id:  49},  // '1' 00001
    {code: 0x10000000, length:  5, id:  50},  // '2' 00010
    {code: 0x64000000, length:  6, id:  51},  // '3' 011001
    {code: 0x68000000, length:  6, id:  52},  // '4' 011010
    {code: 0x6c000000, length:  6, id:  53},  // '5' 011011
    {code: 0x70000000, length:  6, id:  54},  // '6' 011100
    {code: 0x74000000, length:  6, id:  55},  // '7' 011101
    {code: 0x78000000, length:  6, id:  56},  // '8' 011110
    {code: 0x7c000000, length:  6, id:  57},  // '9' 011111
    {code: 0xb8000000, length:  7, id:  58},  // ':' 1011100
    {code: 0xfb000000, length:  8, id:  59},  // ';' 11111011
    {code: 0xfff80000, length: 15, id:  60},  // '<' 11111111|1111100
    {code: 0x80000000, length:  6, id:  61},  // '=' 100000
    {code: 0xffb00000, length: 12, id:  62},  // '>' 11111111|1011
    {code: 0xff000000, length: 10, id:  63},  // '?' 11111111|00
    {code: 0xffd00000, length: 13, id:  64},  // '@' 11111111|11010
    {code: 0x84000000, length:  6, id:  65},  // 'A' 100001
    {code: 0xba000000, length:  7, id:  66},  // 'B' 1011101
    {code: 0xbc000000, length:  7, id:  67},  // 'C' 1011110
    {code: 0xbe000000, length:  7, id:  68},  // 'D' 1011111
    {code: 0xc0000000, length:  7, id:  69},  // 'E' 1100000
    {code: 0xc2000000, length:  7, id:  70},  // 'F' 1100001
    {code: 0xc4000000, length:  7, id:  71},  // 'G' 1100010
    {code: 0xc6000000, length:  7, id:  72},  // 'H' 1100011
    {code: 0xc8000000, length:  7, id:  73},  // 'I' 1100100
    {code: 0xca000000, length:  7, id:  74},  // 'J' 1100101
    {code: 0xcc000000, length:  7, id:  75},  // 'K' 1100110
    {code: 0xce000000, length:  7, id:  76},  // 'L' 1100111
    {code: 0xd0000000, length:  7, id:  77},  // 'M' 1101000
    {code: 0xd2000000, length:  7, id:  78},  // 'N' 1101001
    {code: 0xd4000000, length:  7, id:  79},  // 'O' 1101010
    {code: 0xd6000000, length:  7, id:  80},  // 'P' 1101011
    {code: 0xd8000000, length:  7, id:  81},  // 'Q' 1101100
    {code: 0xda000000, length:  7, id:  82},  // 'R' 1101101
    {code: 0xdc000000, length:  7, id:  83},  // 'S' 1101110
    {code: 0xde000000, length:  7, id:  84},  // 'T' 1101111
    {code: 0xe0000000, length:  7, id:  85},  // 'U' 1110000
    {code: 0xe2000000, length:  7, id:  86},  // 'V' 1110001
    {code: 0xe4000000, length:  7, id:  87},  // 'W' 1110010
    {code: 0xfc000000, length:  8, id:  88},  // 'X' 11111100
    {code: 0xe6000000, length:  7, id:  89},  // 'Y' 1110011
    {code: 0xfd000000, length:  8, id:  90},  // 'Z' 11111101
    {code: 0xffd80000, length: 13, id:  91},  // '[' 11111111|11011
    {code: 0xfffe0000, length: 19, id:  92},  // '\' 11111111|11111110|000
    {code: 0xffe00000, length: 13, id:  93},  // ']' 11111111|11100
    {code: 0xfff00000, length: 14, id:  94},  // '^' 11111111|111100
    {code: 0x88000000, length:  6, id:  95},  // '_' 100010
    {code: 0xfffa0000, length: 15, id:  96},  // '`' 11111111|1111101
    {code: 0x18000000, length:  5, id:  97},  // 'a' 00011
    {code: 0x8c000000, length:  6, id:  98},  // 'b' 100011
    {code: 0x20000000, length:  5, id:  99},  // 'c' 00100
    {code: 0x90000000, length:  6, id: 100},  // 'd' 100100
    {code: 0x28000000, length:  5, id: 101},  // 'e' 00101
    {code: 0x94000000, length:  6, id: 102},  // 'f' 100101
    {code: 0x98000000, length:  6, id: 103},  // 'g' 100110
    {code: 0x9c000000, length:  6, id: 104},  // 'h' 100111
    {code: 0x30000000, length:  5, id: 105},  // 'i' 00110
    {code: 0xe8000000, length:  7, id: 106},  // 'j' 1110100
    {code: 0xea000000, length:  7, id: 107},  // 'k' 1110101
    {code: 0xa0000000, length:  6, id: 108},  // 'l' 101000
    {code: 0xa4000000, length:  6, id: 109},  // 'm' 101001
    {code: 0xa8000000, length:  6, id: 110},  // 'n' 101010
    {code: 0x38000000, length:  5, id: 111},  // 'o' 00111
    {code: 0xac000000, length:  6, id: 112},  // 'p' 101011
    {code: 0xec000000, length:  7, id: 113},  // 'q' 1110110
    {code: 0xb0000000, length:  6, id: 114},  // 'r' 101100
    {code: 0x40000000, length:  5, id: 115},  // 's' 01000
    {code: 0x48000000, length:  5, id: 116},  // 't' 01001
    {code: 0xb4000000, length:  6, id: 117},  // 'u' 101101
    {code: 0xee000000, length:  7, id: 118},  // 'v' 1110111
    {code: 0xf0000000, length:  7, id: 119},  // 'w' 1111000
    {code: 0xf2000000, length:  7, id: 120},  // 'x' 1111001
    {code: 0xf4000000, length:  7, id: 121},  // 'y' 1111010
    {code: 0xf6000000, length:  7, id: 122},  // 'z' 1111011
    {code: 0xfffc0000, length: 15, id: 123},  // '{' 11111111|1111110
    {code: 0xff800000, length: 11, id: 124},  // '|' 11111111|100
    {code: 0xfff40000, length: 14, id: 125},  // '}' 11111111|111101
    {code: 0xffe80000, length: 13, id: 126},  // '~' 11111111|11101
    {code: 0xffffffc0, length: 28, id: 127},  //     11111111|11111111|11111111|1100
    {code: 0xfffe6000, length: 20, id: 128},  //     11111111|11111110|0110
    {code: 0xffff4800, length: 22, id: 129},  //     11111111|11111111|010010
    {code: 0xfffe7000, length: 20, id: 130},  //     11111111|11111110|0111
    {code: 0xfffe8000, length: 20, id: 131},  //     11111111|11111110|1000
    {code: 0xffff4c00, length: 22, id: 132},  //     11111111|11111111|010011
    {code: 0xffff5000, length: 22, id: 133},  //     11111111|11111111|010100
    {code: 0xffff5400, length: 22, id: 134},  //     11111111|11111111|010101
    {code: 0xffffb200, length: 23, id: 135},  //     11111111|11111111|1011001
    {code: 0xffff5800, length: 22, id: 136},  //     11111111|11111111|010110
    {code: 0xffffb400, length: 23, id: 137},  //     11111111|11111111|1011010
    {code: 0xffffb600, length: 23, id: 138},  //     11111111|11111111|1011011
    {code: 0xffffb800, length: 23, id: 139},  //     11111111|11111111|1011100
    {code: 0xffffba00, length: 23, id: 140},  //     11111111|11111111|1011101
    {code: 0xffffbc00, length: 23, id: 141},  //     11111111|11111111|1011110
    {code: 0xffffeb00, length: 24, id: 142},  //     11111111|11111111|11101011
    {code: 0xffffbe00, length: 23, id: 143},  //     11111111|11111111|1011111
    {code: 0xffffec00, length: 24, id: 144},  //     11111111|11111111|11101100
    {code: 0xffffed00, length: 24, id: 145},  //     11111111|11111111|11101101
    {code: 0xffff5c00, length: 22, id: 146},  //     11111111|11111111|010111
    {code: 0xffffc000, length: 23, id: 147},  //     11111111|11111111|1100000
    {code: 0xffffee00, length: 24, id: 148},  //     11111111|11111111|11101110
    {code: 0xffffc200, length: 23, id: 149},  //     11111111|11111111|1100001
    {code: 0xffffc400, length: 23, id: 150},  //     11111111|11111111|1100010
    {code: 0xffffc600, length: 23, id: 151},  //     11111111|11111111|1100011
    {code: 0xffffc800, length: 23, id: 152},  //     11111111|11111111|1100100
    {code: 0xfffee000, length: 21, id: 153},  //     11111111|11111110|11100
    {code: 0xffff6000, length: 22, id: 154},  //     11111111|11111111|011000
    {code: 0xffffca00, length: 23, id: 155},  //     11111111|11111111|1100101
    {code: 0xffff6400, length: 22, id: 156},  //     11111111|11111111|011001
    {code: 0xffffcc00, length: 23, id: 157},  //     11111111|11111111|1100110
    {code: 0xffffce00, length: 23, id: 158},  //     11111111|11111111|1100111
    {code: 0xffffef00, length: 24, id: 159},  //     11111111|11111111|11101111
    {code: 0xffff6800, length: 22, id: 160},  //     11111111|11111111|011010
    {code: 0xfffee800, length: 21, id: 161},  //     11111111|11111110|11101
    {code: 0xfffe9000, length: 20, id: 162},  //     11111111|11111110|1001
    {code: 0xffff6c00, length: 22, id: 163},  //     11111111|11111111|011011
    {code: 0xffff7000, length: 22, id: 164},  //     11111111|11111111|011100
    {code: 0xffffd000, length: 23, id: 165},  //     11111111|11111111|1101000
    {code: 0xffffd200, length: 23, id: 166},  //     11111111|11111111|1101001
    {code: 0xfffef000, length: 21, id: 167},  //     11111111|11111110|11110
    {code: 0xffffd400, length: 23, id: 168},  //     11111111|11111111|1101010
    {code: 0xffff7400, length: 22, id: 169},  //     11111111|11111111|011101
    {code: 0xffff7800, length: 22, id: 170},  //     11111111|11111111|011110
    {code: 0xfffff000, length: 24, id: 171},  //     11111111|11111111|11110000
    {code: 0xfffef800, length: 21, id: 172},  //     11111111|11111110|11111
    {code: 0xffff7c00, length: 22, id: 173},  //     11111111|11111111|011111
    {code: 0xffffd600, length: 23, id: 174},  //     11111111|11111111|1101011
    {code: 0xffffd800, length: 23, id: 175},  //     11111111|11111111|1101100
    {code: 0xffff0000, length: 21, id: 176},  //     11111111|11111111|00000
    {code: 0xffff0800, length: 21, id: 177},  //     11111111|11111111|00001
    {code: 0xffff8000, length: 22, id: 178},  //     11111111|11111111|100000
    {code: 0xffff1000, length: 21, id: 179},  //     11111111|11111111|00010
    {code: 0xffffda00, length: 23, id: 180},  //     11111111|11111111|1101101
    {code: 0xffff8400, length: 22, id: 181},  //     11111111|11111111|100001
    {code: 0xffffdc00, length: 23, id: 182},  //     11111111|11111111|1101110
    {code: 0xffffde00, length: 23, id: 183},  //     11111111|11111111|1101111
    {code: 0xfffea000, length: 20, id: 184},  //     11111111|11111110|1010
    {code: 0xffff8800, length: 22, id: 185},  //     11111111|11111111|100010
    {code: 0xffff8c00, length: 22, id: 186},  //     11111111|11111111|100011
    {code: 0xffff9000, length: 22, id: 187},  //     11111111|11111111|100100
    {code: 0xffffe000, length: 23, id: 188},  //     11111111|11111111|1110000
    {code: 0xffff9400, length: 22, id: 189},  //     11111111|11111111|100101
    {code: 0xffff9800, length: 22, id: 190},  //     11111111|11111111|100110
    {code: 0xffffe200, length: 23, id: 191},  //     11111111|11111111|1110001
    {code: 0xfffff800, length: 26, id: 192},  //     11111111|11111111|11111000|00
    {code: 0xfffff840, length: 26, id: 193},  //     11111111|11111111|11111000|01
    {code: 0xfffeb000, length: 20, id: 194},  //     11111111|11111110|1011
    {code: 0xfffe2000, length: 19, id: 195},  //     11111111|11111110|001
    {code: 0xffff9c00, length: 22, id: 196},  //     11111111|11111111|100111
    {code: 0xffffe400, length: 23, id: 197},  //     11111111|11111111|1110010
    {code: 0xffffa000, length: 22, id: 198},  //     11111111|11111111|101000
    {code: 0xfffff600, length: 25, id: 199},  //     11111111|11111111|11110110|0
    {code: 0xfffff880, length: 26, id: 200},  //     11111111|11111111|11111000|10
    {code: 0xfffff8c0, length: 26, id: 201},  //     11111111|11111111|11111000|11
    {code: 0xfffff900, length: 26, id: 202},  //     11111111|11111111|11111001|00
    {code: 0xfffffbc0, length: 27, id: 203},  //     11111111|11111111|11111011|110
    {code: 0xfffffbe0, length: 27, id: 204},  //     11111111|11111111|11111011|111
    {code: 0xfffff940, length: 26, id: 205},  //     11111111|11111111|11111001|01
    {code: 0xfffff100, length: 24, id: 206},  //     11111111|11111111|11110001
    {code: 0xfffff680, length: 25, id: 207},  //     11111111|11111111|11110110|1
    {code: 0xfffe4000, length: 19, id: 208},  //     11111111|11111110|010
    {code: 0xffff1800, length: 21, id: 209},  //     11111111|11111111|00011
    {code: 0xfffff980, length: 26, id: 210},  //     11111111|11111111|11111001|10
    {code: 0xfffffc00, length: 27, id: 211},  //     11111111|11111111|11111100|000
    {code: 0xfffffc20, length: 27, id: 212},  //     11111111|11111111|11111100|001
    {code: 0xfffff9c0, length: 26, id: 213},  //     11111111|11111111|11111001|11
    {code: 0xfffffc40, length: 27, id: 214},  //     11111111|11111111|11111100|010
    {code: 0xfffff200, length: 24, id: 215},  //     11111111|11111111|11110010
    {code: 0xffff2000, length: 21, id: 216},  //     11111111|11111111|00100
    {code: 0xffff2800, length: 21, id: 217},  //     11111111|11111111|00101
    {code: 0xfffffa00, length: 26, id: 218},  //     11111111|11111111|11111010|00
    {code: 0xfffffa40, length: 26, id: 219},  //     11111111|11111111|11111010|01
    {code: 0xffffffd0, length: 28, id: 220},  //     11111111|11111111|11111111|1101
    {code: 0xfffffc60, length: 27, id: 221},  //     11111111|11111111|11111100|011
    {code: 0xfffffc80, length: 27, id: 222},  //     11111111|11111111|11111100|100
    {code: 0xfffffca0, length: 27, id: 223},  //     11111111|11111111|11111100|101
    {code: 0xfffec000, length: 20, id: 224},  //     11111111|11111110|1100
    {code: 0xfffff300, length: 24, id: 225},  //     11111111|11111111|11110011
    {code: 0xfffed000, length: 20, id: 226},  //     11111111|11111110|1101
    {code: 0xffff3000, length: 21, id: 227},  //     11111111|11111111|00110
    {code: 0xffffa400, length: 22, id: 228},  //     11111111|11111111|101001
    {code: 0xffff3800, length: 21, id: 229},  //     11111111|11111111|00111
    {code: 0xffff4000, length: 21, id: 230},  //     11111111|11111111|01000
    {code: 0xffffe600, length: 23, id: 231},  //     11111111|11111111|1110011
    {code: 0xffffa800, length: 22, id: 232},  //     11111111|11111111|101010
    {code: 0xffffac00, length: 22, id: 233},  //     11111111|11111111|101011
    {code: 0xfffff700, length: 25, id: 234},  //     11111111|11111111|11110111|0
    {code: 0xfffff780, length: 25, id: 235},  //     11111111|11111111|11110111|1
    {code: 0xfffff400, length: 24, id: 236},  //     11111111|11111111|11110100
    {code: 0xfffff500, length: 24, id: 237},  //     11111111|11111111|11110101
    {code: 0xfffffa80, length: 26, id: 238},  //     11111111|11111111|11111010|10
    {code: 0xffffe800, length: 23, id: 239},  //     11111111|11111111|1110100
    {code: 0xfffffac0, length: 26, id: 240},  //     11111111|11111111|11111010|11
    {code: 0xfffffcc0, length: 27, id: 241},  //     11111111|11111111|11111100|110
    {code: 0xfffffb00, length: 26, id: 242},  //     11111111|11111111|11111011|00
    {code: 0xfffffb40, length: 26, id: 243},  //     11111111|11111111|11111011|01
    {code: 0xfffffce0, length: 27, id: 244},  //     11111111|11111111|11111100|111
    {code: 0xfffffd00, length: 27, id: 245},  //     11111111|11111111|11111101|000
    {code: 0xfffffd20, length: 27, id: 246},  //     11111111|11111111|11111101|001
    {code: 0xfffffd40, length: 27, id: 247},  //     11111111|11111111|11111101|010
    {code: 0xfffffd60, length: 27, id: 248},  //     11111111|11111111|11111101|011
    {code: 0xffffffe0, length: 28, id: 249},  //     11111111|11111111|11111111|1110
    {code: 0xfffffd80, length: 27, id: 250},  //     11111111|11111111|11111101|100
    {code: 0xfffffda0, length: 27, id: 251},  //     11111111|11111111|11111101|101
    {code: 0xfffffdc0, length: 27, id: 252},  //     11111111|11111111|11111101|110
    {code: 0xfffffde0, length: 27, id: 253},  //     11111111|11111111|11111101|111
    {code: 0xfffffe00, length: 27, id: 254},  //     11111111|11111111|11111110|000
    {code: 0xfffffb80, length: 26, id: 255},  //     11111111|11111111|11111011|10
    {code: 0xfffffffc, length: 30, id: 256},  // EOS 11111111|11111111|11111111|111111
  ].map(function(hpackHuffmanSymbol) {
    return new HpackHuffmanSymbol(hpackHuffmanSymbol.code, hpackHuffmanSymbol.length, hpackHuffmanSymbol.id);
  });
}

module.exports = {
  DEFAULT_HEADER_SIZE_SETTINGS: DEFAULT_HEADER_SIZE_SETTINGS,
  DEFAULT_MAX_STRING_LITERAL_SIZE: DEFAULT_MAX_STRING_LITERAL_SIZE,
  MAX_DECODE_BUFFER_SIZE: MAX_DECODE_BUFFER_SIZE,
  STRING_LITERAL_IDENTITY_ENCODED: STRING_LITERAL_IDENTITY_ENCODED,
  STRING_LITERAL_HUFFMAN_ENCODED: STRING_LITERAL_HUFFMAN_ENCODED,
  INDEXED_OPECODE: INDEXED_OPECODE,
  LITERAL_INCREMENTAL_INDEX_OPECODE: LITERAL_INCREMENTAL_INDEX_OPECODE,
  LITERAL_NO_INDEX_OPECODE: LITERAL_NO_INDEX_OPECODE,
  LITERAL_NEVER_INDEX_OPECODE: LITERAL_NEVER_INDEX_OPECODE,
  ENCODING_CONTEXT_OPECODE: ENCODING_CONTEXT_OPECODE,
  ENCODING_CONTEXT_EMPTY_REFERENCE_SET: ENCODING_CONTEXT_EMPTY_REFERENCE_SET,
  ENCODING_CONTEXT_NEW_MAXIMUM_SIZE: ENCODING_CONTEXT_NEW_MAXIMUM_SIZE,
  HpackHuffmanSymbol: HpackHuffmanSymbol,
  HpackHuffmanCode: HpackHuffmanCode,
}
