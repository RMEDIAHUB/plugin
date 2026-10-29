/*! RMediaHub Filmix v0.1.1 — MIT, Copyright (c) 2026 RMediaHub. */
/*
MIT License

Copyright (c) 2026 RMediaHub contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
(function(){
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

var RMediaHubQR=qrcode;
// The permanent binding key is deliberately included in Lampa cloud backups.
// Provider access/refresh tokens never enter the browser or its exported state.
function createRMediaHubFilmixShared(options) {
    'use strict';
    var KEY='rmediahub.filmix.shared.v1', storage=options.storage;
    var queue=[],working=false,generation=0;
    function origin(value) {
        try {
            var u=new URL(value);
            if(u.protocol!=='https:' && !(options.allowLoopback && u.protocol==='http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname)))return '';
            return !u.username && !u.password && !u.search && !u.hash && u.pathname==='/'?u.origin:'';
        } catch(e){return '';}
    }
    var fixed=options.origin?origin(options.origin):'';
    function read() {
        var s;
        try {s=JSON.parse(storage.getItem(KEY) || 'null') || {version:1,origin:fixed};}
        catch(e){throw new Error('local_storage_unavailable');}
        if(s.version!==1 || (s.key && !/^[a-f0-9]{64}$/.test(s.key)))throw new Error('shared_session_invalid');
        s.origin=origin(s.origin || fixed);
        if(fixed && s.origin!==fixed)throw new Error('shared_service_mismatch');
        if(!s.origin)throw new Error('shared_service_required');
        return s;
    }
    function save(s) {
        try {storage.setItem(KEY,JSON.stringify(s));}
        catch(e){throw new Error('local_storage_unavailable');}
    }
    function searchBody(body) {
        body=body || {};
        var card=body.movie || {}, movie={};
        // Lampa cards can contain large credits, reviews and image galleries.
        // Matching needs only these bounded scalar fields, never the full card.
        ['title','name','original_title','original_name','release_date','first_air_date','year',
            'type','media_type','imdb_id','imdb','kinopoisk_id','kinopoisk'].forEach(function(key){
            var value=card[key];
            if(typeof value==='string')movie[key]=value.slice(0,/^(title|name|original_title|original_name)$/.test(key)?1000:64);
            else if(typeof value==='number' && isFinite(value))movie[key]=value;
        });
        return {movie:movie,query:typeof body.query==='string'?body.query.slice(0,150):''};
    }
    function send(s,path,body,done) {
        var epoch=generation;
        options.transport(s.origin+'/filmix'+path,s.key,body,function(error,data){
            if(error)return done(error);
            if(!data || typeof data!=='object')return done('upstream_bad_response');
            done(data.error || null,data);
        });
    }
    function pump() {
        if(working || !queue.length)return;
        working=true;
        var j=queue.shift(),called=false,epoch=generation;
        function done(error,data) {
            if(called)return;called=true;working=false;
            try {if(!j.cancelled && epoch===generation)j.done(error,data);}finally{pump();}
        }
        try {
            var s=read();
            if(!s.key) {
                if(j.path==='/api/status' || j.path==='/api/restore')return done(null,{state:'unlinked',linked:false,direct:false,connection:'shared',rotations:0});
                if(['/api/link/start','/api/link/token'].indexOf(j.path)<0)return done('link_required');
                var bytes=new Uint8Array(32);options.randomValues(bytes);
                s.key=Array.prototype.map.call(bytes,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
                // Commit before registration; a lost reply retries the same key.
                save(s);
            }
            function rpc() {send(s,'/api/rpc',{method:j.method,path:j.path,body:j.body || {}},done);}
            if(['/api/link/start','/api/link/token'].indexOf(j.path)>=0)send(s,'/api/shared/register',{},function(error){if(error)done(error);else rpc();});
            else rpc();
        } catch(e){done(e.message);}
    }
    return {
        request:function(method,path,body,done) {
            if(path==='/api/session/forget') {
                // Detach only this copy. Never revoke the shared server session.
                generation++;queue=[];
                try {var raw=storage.getItem(KEY),old=raw?JSON.parse(raw):{};storage.removeItem(KEY);
                    var keep=origin(old.origin || fixed);if(keep)save({version:1,origin:keep});done(null,{forgotten:true});}
                catch(e){done('local_storage_unavailable');}
                return {abort:function(){}};
            }
            var j={method:method,path:path,body:path==='/api/watch/find'?searchBody(body):body,done:done,cancelled:false};
            queue.push(j);pump();return {abort:function(){j.cancelled=true;}};
        },
        configure:function(value) {
            var next=origin(value);if(!next || (fixed && next!==fixed))throw new Error('shared_service_mismatch');
            var current;try {current=read();}catch(e){if(e.message!=='shared_service_required')throw e;}
            if(current && current.key && current.origin!==next)throw new Error('shared_service_mismatch');
            current=current || {version:1};current.origin=next;save(current);
        }
    };
}

function createRMediaHubStartGuard(later,cancel,onTimeout) {
    var timer=null,last=null;
    function stop(){if(timer!==null)cancel(timer);timer=null;last=null;}
    return {start:function(){stop();timer=later(function(){timer=null;onTimeout();},30000);},
        time:function(value){value=Number(value);if(!isFinite(value))return;
            if(last!==null && value-last>=0.5 && value-last<=5)stop();else last=value;},stop:stop};
}


function selectRMediaHubAudioTrack(audio,tracks,expectedCount) {
    if(!audio || !tracks || !tracks.length)return -1;
    function norm(v){return String(v || '').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-яіїєґ0-9]+/g,' ');}
    var best=-1,score=0,tied=false,bestLabels=[],bestAuthor=false;
    Array.prototype.forEach.call(tracks,function(track,i){
        var label=norm([track.name,track.label,track.language,track.lang,track.codec,track.audioCodec,track.extra && track.extra.fourCC].join(' '));
        var s=0,author=norm(audio.author).trim(),type=norm(audio.type).trim(),codec=norm(audio.codec).trim();
        var authorMatch=!!author && label.indexOf(author)>=0;
        if(authorMatch)s+=8;
        if(type && label.indexOf(type)>=0)s+=2;
        if(codec && label.indexOf(codec)>=0)s+=1;
        var aliases={rus:['rus','ru','русский'],ukr:['ukr','uk','українська','украинский'],eng:['eng','en','english'],kaz:['kaz','kk'],uzb:['uzb','uz']};
        var langs=aliases[audio.lang] || [audio.lang];
        if(langs.some(function(l){return l && (' '+label+' ').indexOf(' '+l+' ')>=0;}))s+=3;
        if(s>score){score=s;best=i;tied=false;bestLabels=[label];bestAuthor=authorMatch;}else if(s===score){tied=true;bestLabels.push(label);}
    });
    if(best>=0 && !tied && score>=3 && (!audio.author || bestAuthor))return best;
    // HLS may repeat the same voice in several bitrate groups; those entries are equivalent.
    if(best>=0 && score>=11 && bestLabels.every(function(v){return v===bestLabels[0];}))return best;
    if(tracks.length===expectedCount && audio.position>=0 && audio.position<tracks.length)return audio.position;
    return -1;
}

function parseRMediaHubFilmixLink(value) {
    try {
        var u=new URL(String(value).trim());
        if(u.protocol!=='https:' || !/^(www\.)?filmix\.(gg|my|ac|lat)$/.test(u.hostname))return null;
        var match=u.pathname.match(/\/(\d+)-[^/]*\.html$/);
        return match?{itemId:match[1],season:0,episode:1}:null;
    } catch(e){return null;}
}

(function () {
    'use strict';
    if (window.rmediahub_filmix_loaded) return;
    if (!window.Lampa || !window.jQuery) return;
    window.rmediahub_filmix_loaded = true;
    var L = window.Lampa, $ = window.jQuery;
    var BASE = "https://kinopub.rmediahub.app";
    var ready = false, authGeneration = 0, authTimer = null, lastPlayback = null;
    var icon = '<svg viewBox="0 0 44 44" width="44" height="44" fill="none"><rect x="3" y="7" width="38" height="29" rx="7" stroke="currentColor" stroke-width="3"/><path d="M18 14l13 8-13 8z" fill="currentColor"/></svg>';
    var messages = {
        filmix_token_invalid: 'Filmix не подтвердил токен. Добавьте действующий токен или подключите устройство по коду.',
        filmix_unreachable: 'Filmix временно недоступен. Привязка сохранена.',
        filmix_bad_response: 'Filmix вернул неожиданный ответ. Повторите позже.',
        filmix_quality_unavailable: 'Для этой озвучки нет доступного качества вашей подписки.',
        session_busy: 'RMediaHub продлевает общую сессию. Повторите позже.',
        shared_service_required: 'Укажите HTTPS адрес сервиса RMediaHub для общей привязки.',
        shared_service_mismatch: 'Адрес сервиса не совпадает с общей привязкой. Проверьте адрес плагина.',
        shared_session_invalid: 'Общая привязка повреждена. Импортируйте настройки с работающего устройства.',
        session_missing: 'Общая привязка не найдена на сервере. Откройте «Источник → Привязать Filmix».',
        session_limit: 'На сервере достигнут лимит привязок. Обратитесь к администратору RMediaHub.',
        invalid_refresh_token: 'Общую сессию отклонил Filmix. Привяжите её заново один раз.',
        secure_random_unavailable: 'Лампа не может создать ключ привязки. Обновите приложение.',
        link_required: 'Filmix требует новую привязку RMediaHub.',
        refresh_uncertain: 'Результат обновления неизвестен. Нужна новая привязка RMediaHub.',
        upstream_unreachable: 'Filmix временно недоступен. Сессия сохранена.',
        upstream_rate_limit: 'Filmix ограничил запросы. Повторите позже.',
        invalid_client: 'Filmix отклонил публичный клиент. Потребуется обновление плагина.',
        code_expired: 'Код истёк. Получите новый.',
        access_denied: 'Привязка отклонена на стороне Filmix.',
        no_https_streams: 'Filmix не вернул подходящих HTTPS потоков.',
        local_storage_unavailable: 'Хранилище Lampa недоступно. Сессию нельзя сохранить.',
        already_linked: 'Filmix уже подключён. Для проверки выберите «Восстановить сессию».',
        voice_missing: 'Эта дорожка больше не доступна. Обновите список озвучек.',
        video_missing: 'Видео пока не доступно в Filmix.',
        multiaudio_unavailable: 'Filmix не вернул HLS4 с выбором дорожек для этого видео.',
        selected_stream_unavailable: 'Не удалось получить поток этой озвучки. Откройте «Источник → Проверить воспроизведение».',
        playlist_unreachable: 'Плейлист CDN недоступен. Откройте «Источник → Проверить воспроизведение».',
        playlist_audio_unresolved: 'Плейлист не позволяет точно выбрать озвучку. Попробуйте MP4 в настройках RMediaHub.',
        playlist_separate_audio: 'Этот HLS содержит раздельные видео и аудио. Попробуйте MP4 в настройках RMediaHub.',
        playlist_timeout: 'CDN не ответил вовремя. Повторите запуск или выберите MP4 в настройках RMediaHub.',
        search_title_missing: 'В карточке нет названия для поиска.',
        network: 'Нет прямого соединения с Filmix. Проверьте сеть и доступность API.'
    };
    function stateLabel(data) {
        if(data.linked && data.subscription)return 'Filmix подключён · '+data.subscription.tier+' · до '+(data.subscription.quality>=2160?'4K':data.subscription.quality+'p')+(data.subscription.expiresAt?' · до '+data.subscription.expiresAt.slice(0,10):'');
        var labels = { linked:'Filmix подключён', pending:'Ожидается подтверждение кода',
            unlinked:'Filmix ещё не привязан', link_required:'Требуется новая привязка Filmix',
            configuration_error:'Filmix отклонил клиент приложения',
            refresh_uncertain:'Обновление не подтверждено. Требуется новая привязка.' };
        return labels[data.state] || 'Проверьте состояние в диагностике';
    }
    function sharedTransport(url,key,data,done) {
        var xhr=new XMLHttpRequest(),finished=false;
        function end(error,value){if(!finished){finished=true;done(error,value);}}
        xhr.open('POST',url,true);xhr.timeout=60000;xhr.withCredentials=false;
        xhr.setRequestHeader('Content-Type','application/json');xhr.setRequestHeader('Authorization','Bearer '+key);
        xhr.onload=function(){
            var response;try{response=JSON.parse(xhr.responseText);}catch(e){return end('upstream_bad_response');}
            if(xhr.status>=400 && !response.error)return end('upstream_unreachable');
            end(null,response);
        };
        xhr.onerror=xhr.onabort=xhr.ontimeout=function(){end('network');};xhr.send(JSON.stringify(data));
    }
    var Shared=createRMediaHubFilmixShared({storage:localStorage,origin:BASE,transport:sharedTransport,
        randomValues:function(bytes){if(!window.crypto || !window.crypto.getRandomValues)throw new Error('secure_random_unavailable');window.crypto.getRandomValues(bytes);}});
    function configureShared() {
        input('Адрес сервиса общей привязки RMediaHub (HTTPS)',false,function(value){
            try {Shared.configure(value);L.Noty.show('Адрес сохранён. Теперь привяжите Filmix один раз и экспортируйте настройки в облако.');}
            catch(e){toast(e.message);}
        });
    }
    function request(method,path,body,done){return Shared.request(method,path,body,done);}
    function toast(error) { L.Noty.show(messages[error] || ('RMediaHub: ' + error)); }
    function platform() {
        var names=['tizen','webos','android','apple','orsay'], found='browser';
        if(L.Platform && L.Platform.is)names.some(function(name){if(L.Platform.is(name)){found=name;return true;}return false;});
        if(found==='browser' && /tizen/i.test(navigator.userAgent || ''))found='tizen';
        return found;
    }
    function playbackDiagnostics() {
        var player=String(L.Storage.field('player') || '').replace(/[^a-z0-9_-]/gi,'').slice(0,30);
        var report={plugin:'0.1.1',platform:platform(),player:player,
            format:L.Storage.field('rmediahub_filmix_format') || 'auto',lastPlayback:lastPlayback};
        L.Modal.open({title:'Filmix · Проверка воспроизведения',html:$('<pre class="rmhf-report"></pre>').text(JSON.stringify(report,null,2)),
            size:'large',onBack:function(){L.Modal.close();focus();}});
    }
    function focus() { L.Controller.toggle('content'); }
    function escape(value) { return $('<div>').text(String(value || '')).html(); }
    function choose(title, items, selected) {
        L.Select.show({
            title: title, items: items,
            onSelect: function (item) { L.Select.close(); selected(item); },
            onBack: focus
        });
    }
    function input(title, password, done) {
        L.Input.edit({ title: title, value: '', free: true, nosave: true, password: !!password }, function (value) {
            focus();
            if (value && value.trim()) done(value.trim());
        });
    }
    function stopAuth() { authGeneration++; clearTimeout(authTimer); authTimer = null; }
    function closeAuth() { stopAuth(); L.Modal.close(); focus(); }
    function addToken(onLinked) {
        input('Добавить токен Filmix',true,function(value){
            request('POST','/api/link/token',{token:value},function(err,data){
                if(err)return toast(err);
                L.Noty.show('Filmix подключён. Экспортируйте настройки в облако, затем импортируйте на ТВ.');
                if(typeof onLinked==='function')onLinked(data);else openSource();
            });
        });
    }
    function link(onLinked) {
        stopAuth();
        var generation = authGeneration;
        request('POST', '/api/link/start', {}, function (error, data) {
            if (generation !== authGeneration) return;
            if (error) return toast(error);
            var p = data.pending;
            if (!p) return toast('code_expired');
            var html = $('<div class="rmhf-pair"></div>');
            var qr = $('<div class="rmhf-qr"></div>').appendTo(html);
            try {
                var code = RMediaHubQR(0, 'M');
                code.addData(p.qrUri); code.make();
                qr.html(code.createSvgTag(5, 20));
            } catch (e) { qr.text('Введите код вручную'); }
            var info = $('<div></div>').appendTo(html);
            $('<h2></h2>').text('Привязка Filmix').appendTo(info);
            $('<p></p>').text('Откройте адрес или отсканируйте QR:').appendTo(info);
            $('<p class="rmhf-uri"></p>').text(p.verificationUri).appendTo(info);
            $('<p></p>').text('Введите код:').appendTo(info);
            $('<div class="rmhf-code"></div>').text(p.userCode).appendTo(info);
            $('<p></p>').text('QR открывает Filmix. Если код не заполнен, введите его вручную.').appendTo(info);
            var status = $('<p></p>').text('Ожидаем подтверждения…').appendTo(info);
            var buttons = [{ name: 'Закрыть', onSelect: closeAuth }, {
                name: 'Отменить код', onSelect: function () {
                    closeAuth();
                    request('POST','/api/link/cancel',{},function (err) { if (err) toast(err); });
                }
            }];
            L.Modal.open({title:'RM · Filmix',html:html,size:'large',buttons:buttons,onBack:closeAuth});
            function schedule(seconds) { authTimer = setTimeout(poll, Math.max(1, seconds) * 1000); }
            function poll() {
                if (generation !== authGeneration) return;
                if (Date.now() >= p.expiresAt) { status.text('Код истёк. Закройте окно и получите новый.'); return; }
                request('POST','/api/link/poll',{},function (err, next) {
                    if (generation !== authGeneration) return;
                    if (err) {
                        status.text(messages[err] || ('RMediaHub: '+err));
                        if (err === 'network' || err === 'upstream_unreachable' || err === 'filmix_unreachable' || err === 'upstream_rate_limit') schedule(10);
                        return;
                    }
                    if (next.linked) { closeAuth(); $('.rmhf-state').text('Filmix подключён'); L.Noty.show('Filmix привязан к RMediaHub'); if(typeof onLinked==='function')onLinked(); return; }
                    schedule(next.retryAfter || (next.pending && next.pending.interval) || p.interval);
                });
            }
            schedule(p.interval);
        });
    }
    function diagnostics() {
        request('GET','/api/status',null,function (error, data) {
            if (error) return toast(error);
            var report = {
                plugin:'RMediaHub 0.1.1', api:BASE, connection:'shared', lampa:L.Manifest.app_version,
                provider:'Filmix',subscription:data.subscription,state:data.state, expiresAt:data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
                lastRefreshAt:data.lastRefreshAt ? new Date(data.lastRefreshAt).toISOString() : null,
                rotations:data.rotations, lastError:data.lastError, notifyError:data.notifyError,
                pending:!!data.pending, direct:false,platform:platform(),lastPlayback:lastPlayback
            };
            L.Modal.open({title:'RMediaHub · Filmix · Диагностика',html:$('<pre class="rmhf-report"></pre>').text(JSON.stringify(report,null,2)),size:'large',
                onBack:function () { L.Modal.close(); focus(); }});
        });
    }
    function restore(done) {
        return request('POST','/api/restore',{},function (error,data) {
            // A network failure never deletes the permanent binding key.
            if (done) done(error,data);
        });
    }
    function forget() {
        choose('Удалить только сессию RMediaHub из этой Лампы?', [
            {title:'Оставить',yes:false}, {title:'Удалить сессию RMediaHub',yes:true}
        ],function(item) {
            if (!item.yes) return focus();
            stopAuth();
            request('POST','/api/session/forget',{},function(error) {
                if (error && error !== 'session_missing') return toast(error);
                L.Noty.show('Сессия RMediaHub удалена. Запись устройства Filmix не удалялась.');
                focus();
            });
        });
    }
    function openSource(movie) {
        if(movie && (movie.title || movie.name))return openWatch(movie);
        L.Activity.push({url:'',title:'RM · Filmix',component:'rmediahub_filmix_source',movie:movie || null,page:1});
    }
    function openWatch(movie,itemId) {
        L.Select.close();
        L.Activity.push({url:'',title:'RM · Filmix',component:'rmediahub_filmix_watch',
            movie:movie,itemId:itemId || null,page:1});
    }
    function poster(movie,backdrop) {
        var path=backdrop?movie.backdrop_path:movie.poster_path;
        var url=backdrop?(movie.backdrop || ''):(movie.img || movie.poster || '');
        if(!url && path)url=L.TMDB && L.TMDB.image?L.TMDB.image('t/p/'+(backdrop?'w780':'w500')+path):'';
        return typeof url==='string' && /^https?:\/\//i.test(url)?url.replace(/^http:\/\//i,'https://'):'';
    }
    function editionLabel(type) {
        var names={movie:'2D', '3d':'3D',serial:'Сериал',documovie:'Документальный фильм',docuserial:'Документальный сериал',concert:'Концерт',tvshow:'ТВ-шоу'};
        return names[String(type || '').toLowerCase()] || 'Версия';
    }
    function Watch(object) {
        var self=this, card=object.movie || {}, alive=true, started=false, generation=0, last=false, requests=[];
        var detail=null, video=null, candidates=[], language='', quality='', busy=false,automaticItemId=null,pageItemId=null;
        var title=card.title || card.name || '', year=String(card.release_date || card.first_air_date || card.year || '').slice(0,4);
        var files=new L.Files({movie:{id:card.id,title:escape(title),original_title:escape(card.original_title || card.original_name || ''),img:poster(card),source:card.source}});
        var root=files.render().addClass('rmhf-watch'), scroll=new L.Scroll({mask:true,over:true});
        var body=$('<div class="rmhf-watch-body"></div>'), bar=$('<div class="rmhf-tools"></div>'), rows=$('<div class="rmhf-rows"></div>');
        var meta=$('<div class="rmhf-movie-meta"></div>').text(year).appendTo(root.find('.files__info'));
        $('<div class="rmhf-plot"></div>').text(card.overview || card.plot || '').appendTo(root.find('.files__info'));
        var state=$('<div class="rmhf-watch-state"></div>');
        function call(method,path,data,done) {
            var version=generation;
            var r=request(method,path,data,function(err,res){if(alive && version===generation)done(err,res);});
            requests.push(r);return r;
        }
        function loading(value) {busy=value;if(self.activity)self.activity.loader(value);}
        function activate() {if(started && alive)self.start();}
        function trackFocus(el) {
            el.on('hover:focus',function(){last=this;scroll.update($(this),true);});return el;
        }
        function tool(label,value,action) {
            var el=$('<div class="simple-button simple-button--filter selector rmhf-tool"><span></span><div></div></div>');
            el.find('span').text(label);el.find('div').text(value || '').toggleClass('hide',!value);
            el.on('hover:enter',action);trackFocus(el);bar.append(el);return el;
        }
        function error(err) {
            loading(false);rows.empty();state.text(messages[err] || ('Ошибка Filmix: '+err));
            action('Повторить поиск',function(){find();});
            if(['link_required','refresh_uncertain','session_missing','invalid_refresh_token'].indexOf(err)>=0)action('Привязать Filmix',function(){link(function(){find();});});
            else action('Настройки Filmix',function(){openSource();});
            activate();
        }
        function action(label,fn) {
            var el=$('<div class="rmhf-action selector"></div>').text(label).on('hover:enter',fn);
            rows.append(trackFocus(el));return el;
        }
        function timeline(v) {
            var hash=L.Utils.hash('rmediahub:filmix:'+detail.id+':'+v.key);
            return L.Timeline.view(hash,L.Timeline.link?L.Timeline.link(card,v.season,v.episode):null);
        }
        function qualityLabel(value) {
            var number=parseInt(value,10);return number>=2160?'4K':number?number+'p':String(value || '');
        }
        function currentVoices() {
            if(!video)return [];
            return video.audios && video.audios.length?video.audios:[{key:'',label:'Озвучка по умолчанию',lang:'',codec:''}];
        }
        function openFilmixLink() {
            input('Ссылка на фильм Filmix',false,function(value){
                var parsed=parseRMediaHubFilmixLink(value);
                if(!parsed)return L.Noty.show('Введите ссылку на фильм или сериал с filmix.gg');
                object.season=parsed.season>0?parsed.season:null;object.episode=parsed.season>0?parsed.episode:null;
                object.videoIndex=parsed.season===0 && parsed.episode>0?parsed.episode-1:null;
                pageItemId=parsed.itemId;candidates=[];loadItem(parsed.itemId,true);
            });
        }
        function checkAudios() {
            if(!detail || !video)return;
            loading(true);
            call('POST','/api/audio/diagnostics',{itemId:detail.id,videoKey:video.key},function(err,report){
                loading(false);if(err)return toast(err);
                report.selection={automaticItemId:automaticItemId,pageItemId:pageItemId,currentItemId:detail.id};
                var html=$('<div class="rmhf-report"></div>');
                $('<p></p>').text('Карточка Filmix: '+report.itemId+(automaticItemId?' · Найдена автоматически: '+automaticItemId:'')).appendTo(html);
                $('<h2></h2>').text('Обычный запрос: '+(report.counts.full==null?'ошибка':report.counts.full+' дорожек')).appendTo(html);
                $('<p></p>').text('Облегчённый запрос: '+(report.counts.compact==null?'ошибка':report.counts.compact+' дорожек')).appendTo(html);
                $('<pre></pre>').text(JSON.stringify(report,null,2)).appendTo(html);
                L.Modal.open({title:'Filmix · Проверка озвучек',html:html,size:'large',
                    onBack:function(){L.Modal.close();activate();}});
            });
        }
        function rebuildTools() {
            bar.empty();
            tool('Поиск',title,function(){input('Уточнить название в Filmix',false,function(q){find(q);});});
            tool('Источник','Filmix',function(){
                var items=[{title:'Filmix',selected:true},{title:'Открыть ссылку Filmix',open:true}];
                if(detail)items.push({title:'Обновить озвучки',reload:true},{title:'Проверить озвучки',diagnostics:true});
                items.push({title:'Проверить воспроизведение',playback:true});
                choose('Источник',items,function(a){if(a.open)openFilmixLink();else if(a.reload)loadItem(detail.id,true);else if(a.diagnostics)checkAudios();else if(a.playback)playbackDiagnostics();else activate();});
            });
            if(detail && detail.videos.length>1) {
                var seasons=[];
                detail.videos.forEach(function(v){if(v.season!==null && seasons.indexOf(v.season)<0)seasons.push(v.season);});
                if(seasons.length)tool('Сезон',String(video.season),function(){
                    choose('Сезон',seasons.map(function(s){return {title:'Сезон '+s,value:s,selected:s===video.season};}),function(a){
                        video=detail.videos.filter(function(v){return v.season===a.value;})[0];language='';renderVoices();
                    });
                });
                tool(seasons.length?'Серия':'Видео',video.episode?String(video.episode):video.title,function(){
                    choose(seasons.length?'Серия':'Видео',detail.videos.filter(function(v){return v.season===video.season;}).map(function(v){return {title:escape(v.title),video:v,selected:v.key===video.key};}),function(a){video=a.video;language='';renderVoices();});
                });
            }
            if(video)tool('Фильтр',language?language.toUpperCase():'Все озвучки',function(){
                var langs=[];currentVoices().forEach(function(a){if(a.lang && langs.indexOf(a.lang)<0)langs.push(a.lang);});
                choose('Язык озвучки',[{title:'Все озвучки',lang:'',selected:!language}].concat(langs.map(function(l){return {title:l.toUpperCase(),lang:l,selected:language===l};})),function(a){language=a.lang;renderVoices();});
            });
            if(video)tool('Качество',quality || 'Спросить',function(){
                choose('Предпочитаемое качество',[{title:'Спрашивать перед запуском',value:''},{title:'Максимальное',value:'max'},
                    {title:'1080p',value:'1080'},{title:'720p',value:'720'}],function(a){quality=a.value;rebuildTools();activate();});
            });
            tool('Настройки','',function(){openSource();});
        }
        function renderVoices() {
            rows.empty();last=false;rebuildTools();loading(false);
            state.text(detail.title.split(' / ')[0]+' · '+editionLabel(detail.type)+(video.season!==null?' · Сезон '+video.season+', серия '+video.episode:'')+
                ' · Озвучек: '+(video.audios || []).length);
            var list=currentVoices().filter(function(a){return !language || a.lang===language;});
            list.forEach(function(a){
                var row=$('<div class="rmhf-voice selector"><div class="rmhf-voice-image"><img/><span>▶</span></div><div class="rmhf-voice-body"><div class="rmhf-voice-top"><strong></strong><small></small></div><div class="rmhf-progress"><div></div></div><div class="rmhf-voice-bottom"><span></span><b></b></div></div></div>');
                var thumbnail=video.thumbnail || poster(card,true) || poster(card) || detail.poster;
                row.find('img').attr('src',thumbnail).on('error',function(){$(this).hide();});
                row.find('strong').text(a.label);
                row.find('small').text(video.duration?Math.ceil(video.duration/60)+' мин':'');
                var formats=['Filmix'];if(a.lang)formats.push(a.lang.toUpperCase());if(a.codec)formats.push(a.codec);
                if(a.channels)formats.push(a.channels===6?'5.1':a.channels===2?'2.0':a.channels+' ch');
                row.find('.rmhf-voice-bottom span').text(formats.join(' · '));
                row.find('b').text(qualityLabel(video.quality || detail.quality));
                var view=timeline(video);row.find('.rmhf-progress div').css('width',Math.max(0,Math.min(100,Number(view.percent)||0))+'%');
                row.on('hover:enter',function(){playVoice(a);});rows.append(trackFocus(row));
            });
            if(!list.length)action('Показать все озвучки',function(){language='';renderVoices();});
            activate();
        }
        function playVoice(audio) {
            if(busy)return;
            var selectedVideo=video, selectedItem=detail.id;
            var requestedStream=L.Storage.field('rmediahub_filmix_format') || 'auto';
            loading(true);
            lastPlayback={state:'requesting',itemId:selectedItem,videoKey:selectedVideo.key,platform:platform(),
                requestedStream:requestedStream,voice:audio.label,startedAt:new Date().toISOString()};
            call('POST','/api/play',{itemId:selectedItem,videoKey:selectedVideo.key,audioKey:audio.key,
                fullAudio:detail.audioMode==='full',platform:platform(),stream:requestedStream},function(err,media){
                loading(false);if(err){lastPlayback.state='request_error';lastPlayback.error=err;return toast(err);}
                lastPlayback.available=media.qualities.map(function(f){return {height:f.height,codec:f.codec,stream:f.stream,
                    audioLocked:f.audioLocked,audioPending:f.audioPending,urlShape:f.urlShape,mp4Available:!!f.fallbackUrl};});
                lastPlayback.state='choosing_quality';
                function launch(file) {startPlayer(file);}
                function startPlayer(file) {
                    lastPlayback.state='starting';lastPlayback.stream=file.stream;lastPlayback.height=file.height;
                    lastPlayback.codec=file.codec;lastPlayback.audioLocked=file.audioLocked;lastPlayback.audioIndex=media.audio?media.audio.streamIndex:null;
                    var playerAudios=file.audioLocked && media.audio?[media.audio]:media.audios;
                    var play={url:file.url,title:title+' · '+audio.label,
                        subtitles:media.subtitles,card:card,timeline:timeline(selectedVideo),
                        translate:{tracks:playerAudios.map(function(a){return {name:a.label,language:a.lang,extra:{channels:a.channels,fourCC:a.codec}};})},
                        rmhfAudio:file.audioLocked?null:media.audio,rmhfAudioCount:playerAudios.length,rmhfPlayback:lastPlayback};
                    // Array entries keep Player's global default from replacing the quality just chosen here.
                    // Never expose unresolved per-voice URLs to a later quality switch.
                    if(media.qualities.length>1 && !media.qualities.some(function(f){return f.audioPending;}))play.quality=media.qualities.map(function(f){return {
                        title:escape(f.label),quality:f.label,url:f.url,selected:f.url===file.url,change_quality:true};});
                    L.Player.play(play);L.Player.playlist([]);
                }
                if(quality) {
                    var ceiling=quality==='max'?Infinity:Number(quality), choices=media.qualities.filter(function(f){return f.height<=ceiling;});
                    launch(choices[0] || media.qualities[media.qualities.length-1]);
                }
                else choose('Качество · '+audio.label,media.qualities.map(function(f){return {title:escape(f.label),file:f};}),function(a){launch(a.file);});
            });
        }
        function loadItem(itemId,forceFull) {
            generation++;
            loading(true);state.text('Загружаем озвучки Filmix…');rows.empty();
            var serial=card.media_type==='tv' || /^(serial|docuserial|tvshow)$/.test(card.type || '') || (card.name && !card.title);
            var full=!!forceFull || !serial;
            call('GET','/api/items/'+itemId+(full?'?full=1':''),null,function(err,data){
                if(err)return error(err);detail=data;video=data.videos[0];language='';
                if(!video)return error('video_missing');
                if(object.videoIndex!=null)video=data.videos[object.videoIndex] || video;
                if(object.season || object.episode)video=data.videos.filter(function(v){return (!object.season || v.season===Number(object.season)) && (!object.episode || v.episode===Number(object.episode));})[0] || video;
                meta.text([data.year || year,editionLabel(data.type),qualityLabel(data.quality)].filter(Boolean).join(' · '));
                renderVoices();
            });
        }
        function renderMatches() {
            loading(false);rows.empty();video=null;rebuildTools();last=false;
            state.text(candidates.length?'Выберите совпадение в Filmix':'В Filmix пока нет подходящего фильма. Можно уточнить название.');
            candidates.forEach(function(item){action(item.title+' · '+(item.year || '')+' · '+editionLabel(item.type)+' · '+qualityLabel(item.quality),function(){loadItem(item.id);});});
            if(!candidates.length)action('Уточнить название',function(){input('Поиск в Filmix',false,function(q){find(q);});});
            activate();
        }
        function find(query) {
            generation++;detail=null;video=null;rows.empty();last=false;rebuildTools();loading(true);
            state.text('Ищем «'+title+'» в Filmix…');
            call('POST','/api/watch/find',{movie:card,query:query || ''},function(err,data){
                if(err)return error(err);candidates=data.items;
                automaticItemId=data.bestId?String(data.bestId):null;
                if(data.bestId)loadItem(data.bestId);else renderMatches();
            });
        }
        function resize() {scroll.minus(window.innerWidth>580?false:root.find('.files__left'));}
        this.create=function(){
            body.append(bar,state,rows);scroll.append(body);files.append(scroll.render());
            scroll.body().addClass('torrent-list');resize();window.addEventListener('resize',resize,false);
            if(object.itemId)loadItem(object.itemId);else find();
            return root;
        };
        this.start=function(){
            if(L.Activity.active() && L.Activity.active().activity!==self.activity)return;
            started=true;
            L.Controller.add('content',{
                toggle:function(){L.Controller.collectionSet(scroll.render(),root);L.Controller.collectionFocus(last || rows.find('.selector').first()[0] || false,scroll.render());},
                up:function(){if(Navigator.canmove('up'))Navigator.move('up');else L.Controller.toggle('head');},
                down:function(){Navigator.move('down');},right:function(){Navigator.move('right');},
                left:function(){if(Navigator.canmove('left'))Navigator.move('left');else L.Controller.toggle('menu');},
                back:function(){L.Activity.backward();}
            });L.Controller.toggle('content');
        };
        this.stop=function(){started=false;};this.pause=function(){};
        this.destroy=function(){alive=false;generation++;requests.forEach(function(r){r.abort();});window.removeEventListener('resize',resize);scroll.destroy();files.destroy();};
        this.render=function(){return root;};
    }
    function Source(object) {
        var self=this, scroll=new L.Scroll({mask:true,over:true}), last=false, alive=true, active=false, requests=[];
        var content=$('<div class="rmhf-screen"></div>');
        $('<div class="rmhf-brand">RM <small>Filmix</small></div>').appendTo(content);
        var state=$('<p class="rmhf-state">Общая привязка Filmix для всех ваших устройств</p>').appendTo(content);
        function call(method,path,body,cb) {
            var xhr=request(method,path,body,function(err,data) { if(alive) cb(err,data); });
            requests.push(xhr); return xhr;
        }
        function button(title,description,fn) {
            var el=$('<div class="rmhf-action selector"><strong></strong><span></span></div>');
            el.find('strong').text(title); el.find('span').text(description || '');
            el.on('hover:focus',function(){last=el[0];scroll.update(el,true);});
            el.on('hover:enter',fn); content.append(el);
        }
        function list(q,type,page) {
                state.text('Загружаем Filmix…');
            call('GET','/api/items?q='+encodeURIComponent(q || '')+'&type='+encodeURIComponent(type || '')+'&page='+page,null,function(err,data) {
                state.text(err ? (messages[err] || err) : 'RM · Filmix');
                if(err) return toast(err);
                var items=data.items.map(function(item){return {title:escape(item.title),subtitle:escape((item.year || '')+' · '+editionLabel(item.type)),item:item};});
                var total=Number(data.pagination.total || page),current=Number(data.pagination.current || page);
                if(current>1) items.push({title:'← Предыдущая страница',page:current-1});
                if(current<total) items.push({title:'Следующая страница →',page:current+1});
                if(!items.length) items.push({title:'Ничего не найдено'});
                choose('RM · Filmix · '+(q || 'Каталог'),items,function(a){
                    if(a.page) list(q,type,a.page);
                    else if(a.item) detail(a.item);
                    else focus();
                });
            });
        }
        function detail(item) {
            openWatch({id:item.id,title:item.title,poster:item.poster,plot:item.plot,year:item.year,source:'rmediahub_filmix',type:item.type},item.id);
        }
        this.create=function() {
            if(object.movie) button('Найти: '+(object.movie.title || object.movie.name || ''),'Выберите совпадение из результатов Filmix',function(){
                list((object.movie.title || object.movie.name || '').split(' / ')[0],'',1);
            });
            button('Поиск','По названию в Filmix',function(){input('Поиск в Filmix',false,function(q){list(q,'',1);});});
            if(!BASE)button('Адрес сервиса RMediaHub','Один адрес для общей привязки',configureShared);
            button('Добавить токен Filmix','Один раз на Mac, затем экспорт и импорт в облаке',function(){addToken();});
            button('Добавить устройство на Filmix','Получить код для страницы filmix.gg/consoles',link);
            button('Восстановить сессию','Проверить подключение Filmix',function(){
                restore(function(err,data){ if(!alive) return; state.text(err ? (messages[err] || err) : stateLabel(data)); if(err) toast(err); });
            });
            button('Диагностика','Состояние сессии без токенов',diagnostics);
            button('Проверить воспроизведение','Платформа, формат и последний запуск без секретных ссылок',playbackDiagnostics);
            button('Удалить сессию RMediaHub','Удаляет только собственную сессию RMediaHub на этом устройстве',forget);
            scroll.append(content);
            requests.push(restore(function(err,data) { if(alive) state.text(err ? (messages[err] || err) : stateLabel(data)); }));
            return this.render();
        };
        this.start=function() {
            active=true;
            L.Controller.add('content',{
                toggle:function(){L.Controller.collectionSet(scroll.render());L.Controller.collectionFocus(last || false,scroll.render());},
                left:function(){L.Controller.toggle('menu');},right:function(){Navigator.move('right');},
                up:function(){Navigator.move('up');},down:function(){Navigator.move('down');},
                back:function(){L.Activity.backward();}
            });
            L.Controller.toggle('content');
        };
        this.stop=function(){active=false;};
        this.destroy=function(){alive=false;active=false;stopAuth();requests.forEach(function(r){if(r)r.abort();});scroll.destroy();content.remove();};
        this.render=function(){return scroll.render();};
    }
    function init() {
        if(ready) return; ready=true;
        if(!L.Input || !L.Scroll || !L.SettingsApi || !L.Manifest || !L.Player) {
            L.Noty.show('RMediaHub: требуется Lampa 3.x с API плагинов'); return;
        }
        $('<style></style>').text(
            '.rmhf-screen{padding:2em;max-width:76em}.rmhf-brand{font-size:2.3em;font-weight:700;color:#a5b4fc}' +
            '.rmhf-brand small{font-size:.5em;color:#94a3b8;margin-left:1em}.rmhf-state{margin:1em 0 1.5em;color:#cbd5e1}' +
            '.rmhf-action{padding:1em 1.2em;margin:.5em 0;background:#172033;border-radius:.6em;border:2px solid transparent}' +
            '.rmhf-action strong,.rmhf-action span{display:block}.rmhf-action span{font-size:.8em;opacity:.7;margin-top:.3em}' +
            '.rmhf-action.focus{border-color:#a5b4fc;background:#263355}.rmhf-pair{display:flex;gap:2em;align-items:center;padding:1em}' +
            '.rmhf-qr{background:white;padding:.4em;flex:0 0 34%;color:#111}.rmhf-qr svg{width:100%;height:auto;display:block}' +
            '.rmhf-uri{word-break:break-all;color:#a5b4fc}.rmhf-code{font-size:3em;letter-spacing:.15em;font-weight:700;margin:.3em 0}' +
            '.rmhf-report{white-space:pre-wrap;word-break:break-word;padding:1em}'
        ).appendTo('head');
        $('<style></style>').text(
            '.rmhf-watch{background:#000;min-height:100%}.rmhf-watch .full-start__poster{width:8em;height:12em;padding:0}' +
            '.rmhf-watch .full-start__poster img{width:100%;height:100%;object-fit:cover;display:block}' +
            '.rmhf-watch .files__info{padding-top:1em}.rmhf-watch .files__title{font-size:1.7em;font-weight:700;line-height:1.2}' +
            '.rmhf-movie-meta{margin:1em 0;opacity:.75}.rmhf-plot{line-height:1.5;font-size:.9em;max-height:26em;overflow:hidden}' +
            '.rmhf-watch-body{padding:.5em 1em 2em}.rmhf-tools{display:flex;flex-wrap:wrap;gap:.5em;margin-bottom:1em}' +
            '.rmhf-tool{margin:0;font-size:.9em}.rmhf-watch-state{opacity:.65;margin:0 0 1em;font-size:.9em}' +
            '.rmhf-voice{display:flex;align-items:center;gap:1.2em;padding:.4em;border:3px solid transparent;border-radius:.6em;margin:.3em 0}' +
            '.rmhf-voice.focus{border-color:var(--color-main,#fff);background:rgba(255,255,255,.06)}' +
            '.rmhf-voice-image{position:relative;flex:0 0 12em;height:7em;background:#253044;border-radius:.3em;overflow:hidden}' +
            '.rmhf-voice-image img{width:100%;height:100%;object-fit:cover}.rmhf-voice-image span{position:absolute;top:.5em;left:.5em;background:rgba(0,0,0,.55);border-radius:50%;padding:.3em .5em}' +
            '.rmhf-voice-body{flex:1;min-width:0}.rmhf-voice-top,.rmhf-voice-bottom{display:flex;justify-content:space-between;gap:1em;align-items:center}' +
            '.rmhf-voice-top strong{font-size:1.5em;font-weight:400;line-height:1.2}.rmhf-voice-top small{white-space:nowrap;opacity:.8}' +
            '.rmhf-voice-bottom{margin-top:.6em;font-size:.8em}.rmhf-voice-bottom b{font-weight:400;white-space:nowrap}' +
            '.rmhf-progress{height:.25em;background:rgba(255,255,255,.28);margin-top:1em;border-radius:1em}.rmhf-progress div{height:100%;background:#fff;border-radius:1em}' +
            '@media(max-width:580px){.rmhf-voice-image{flex-basis:7em;height:4.7em}.rmhf-voice-top strong{font-size:1.15em}.rmhf-voice-top small{display:none}.rmhf-plot{max-height:7em}.rmhf-watch-body{padding:.5em}}'
        ).appendTo('head');
        L.Component.add('rmediahub_filmix_source',Source);
        L.Component.add('rmediahub_filmix_watch',Watch);
        var pendingAudio=null,activePlayback=null;
        var startGuard=createRMediaHubStartGuard(setTimeout,clearTimeout,function(){
            if(!activePlayback)return;
            activePlayback.state='startup_timeout';activePlayback.error='no_time_progress';
            L.Player.close();L.Noty.show('Видео не начало воспроизведение за 30 секунд. Откройте «Источник → Проверить воспроизведение».');
        });
        if(L.PlayerVideo && L.PlayerVideo.listener) {
            L.Player.listener.follow('start',function(data){
                startGuard.stop();
                pendingAudio=data.rmhfAudio?{audio:data.rmhfAudio,count:data.rmhfAudioCount,applied:false}:null;
                activePlayback=data.rmhfPlayback || null;
                if(activePlayback && activePlayback.platform==='tizen')startGuard.start();
            });
            L.Player.listener.follow('destroy',function(){startGuard.stop();pendingAudio=null;activePlayback=null;});
            L.PlayerVideo.listener.follow('timeupdate',function(e){
                if(activePlayback)startGuard.time(e.current);
                if(activePlayback && Number(e.current)>0){activePlayback.state='playing';activePlayback.current=Math.floor(Number(e.current));}
            });
            L.PlayerVideo.listener.follow('error',function(e){
                if(!activePlayback)return;
                startGuard.stop();
                var raw=String(e.error && (e.error.message || e.error.code) || e.error || '');
                var code=raw.match(/PLAYER_ERROR_[A-Z_]+|MEDIA_ERR_[A-Z_]+|manifestLoadError|manifestParsingError|fragLoadError|bufferAppendError/i);
                activePlayback.state='player_error';activePlayback.error=code?code[0]:'player_error';
            });
            L.PlayerVideo.listener.follow('tracks',function(e){
                if(!pendingAudio || pendingAudio.applied)return;
                var index=selectRMediaHubAudioTrack(pendingAudio.audio,e.tracks,pendingAudio.count);
                if(index<0){pendingAudio.applied=true;L.Noty.show('Выбранная озвучка не определена плеером. Выберите дорожку в меню звука.');return;}
                Array.prototype.forEach.call(e.tracks,function(a,i){a.enabled=i===index;a.selected=i===index;});
                if(e.tracks[index].onSelect)e.tracks[index].onSelect(e.tracks[index]);
                if(L.PlayerVideo.setParams){var params=L.PlayerVideo.saveParams?L.PlayerVideo.saveParams():{};params.track=index;L.PlayerVideo.setParams(params);}
                pendingAudio.applied=true;
            });
        }
        window.Lampa.Manifest.plugins={type:'video',version:'0.1.1',name:'RM · Filmix',description:'Общая привязка Filmix через RMediaHub',
            component:'rmediahub_filmix_source',onContextMenu:function(){return {name:'Смотреть в RM · Filmix',description:''};},
            onContextLauch:openSource};
        L.SettingsApi.addComponent({component:'rmediahub_filmix',name:'RM · Filmix',icon:icon});
        L.SettingsApi.addParam({component:'rmediahub_filmix',param:{name:'rmediahub_filmix_open',type:'button'},
            field:{name:'Открыть RM · Filmix',description:'Filmix · привязка, поиск и диагностика'},onChange:function(){openSource();}});
        L.Listener.follow('full',function(e){
            if(e.type!=='complite' || !e.body || e.body.find('.view--rmediahub-fx').length) return;
            var card=e.data && e.data.movie;
            if(!card) return;
            var btn=$('<div class="full-start__button selector view--rmediahub-fx">'+icon+'<span>RM · Filmix</span></div>');
            btn.on('hover:enter',function(){openSource(card);});
            e.body.find('.buttons--container').first().append(btn);
        });
        restore();
    }
    if(window.appready) init();
    else L.Listener.follow('app',function(e){if(e.type==='ready') init();});
}());

}());
