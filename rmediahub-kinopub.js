/*!
 * RMediaHub KinoPub Direct v0.3.3 — MIT, Copyright (c) 2026 RMEDIAHUB.
 * Install: one static JavaScript URL. No RMediaHub server, BWA or third-party proxy.
 * KinoPub OAuth uses the publicly distributed xbmc application client from
 * https://github.com/quarckster/kodi.kino.pub/blob/master/src/resources/lib/auth.py
 * This application key is public by design in the distributed client; it is not
 * a private RMediaHub client secret or a user's account credential.
 * Own access/refresh tokens remain in localStorage on this Lampa origin.
 * KinoPub may restrict/revoke this shared client. Not affiliated with KinoPub.
 * QR Code Generator: Copyright (c) 2009 Kazuhiko Arase, MIT (header below).
 */
/*
MIT License

Copyright (c) 2026 RMEDIAHUB
QR library: Copyright (c) 2009 Kazuhiko Arase

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
/* Direct KinoPub Device Flow. No proxy, telemetry, imported account tokens,
   or server-side API. Public xbmc application credentials are supplied by build. */
function createRMediaHubDirect(options) {
    'use strict';
    var storage = options.storage, transport = options.transport;
    var now = options.now || Date.now, delay = options.setTimeout || setTimeout;
    var clear = options.clearTimeout || clearTimeout;
    var KEY = 'rmediahub.kinopub.direct.v1', LOCK = KEY + '.lease';
    var queue = [], working = false, held = false, currentFinish = null;
    var owner = String(now()) + '-' + String(Math.random()).slice(2);
    var HOST = 'https://api.service-kp.com';
    function assign(target,source){Object.keys(source).forEach(function(k){target[k]=source[k];});return target;}
    function fresh() { return {version:1,state:'unlinked',rotations:0}; }
    function read() {
        var raw, s;
        try { raw=storage.getItem(KEY); s=raw?JSON.parse(raw):fresh(); }
        catch(e) { throw new Error('local_storage_unavailable'); }
        if (!s || s.version!==1) throw new Error('local_storage_unavailable');
        return s;
    }
    function lease() { try { return JSON.parse(storage.getItem(LOCK) || 'null'); } catch(e) { return null; } }
    function save(s) {
        var l=lease();
        if (!held || !l || l.owner!==owner) throw new Error('session_busy');
        try { storage.setItem(KEY,JSON.stringify(s)); }
        catch(e) { throw new Error('local_storage_unavailable'); }
    }
    function https(value) {
        if (typeof value!=='string' || !/^https:\/\//i.test(value) || /^https:\/\/[^/]*@/.test(value)) return '';
        return value;
    }
    function verification(value) { return https(value) && /^https:\/\/(kino\.pub|kino\.watch)(\/|$)/i.test(value); }
    function snapshot(s) {
        return {state:s.state,linked:s.state==='linked',rotations:s.rotations,
            expiresAt:s.tokens?s.tokens.expiresAt:null,lastRefreshAt:s.lastRefreshAt || null,
            lastError:s.lastError || null,notifyError:s.notifyError || null,direct:true,
            pending:s.pending && s.pending.expiresAt>now()?{
                userCode:s.pending.userCode,verificationUri:s.pending.verificationUri,qrUri:s.pending.qrUri,
                expiresAt:s.pending.expiresAt,interval:s.pending.interval
            }:null};
    }
    function form(data) {
        return Object.keys(data).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(data[k]);}).join('&');
    }
    function raw(method,path,params,body,done) {
        var url=HOST+path+(params?'?'+form(params):'');
        var fault=currentFinish;
        transport(method,url,body?form(body):null,function(error,data) {
          try {
            if(error) return done(error);
            if(!data || typeof data!=='object') return done('upstream_bad_response');
            if(data.error || Number(data.status)>=400) {
                var code=typeof data.error==='string'?data.error:'upstream_error';
                if(['authorization_pending','slow_down','code_expired','expired_token','authorization_expired',
                    'invalid_grant','invalid_refresh_token','invalid_token','unauthorized','invalid_client','access_denied'].indexOf(code)<0) code='upstream_error';
                return done(code);
            }
            done(null,data);
          } catch(e) { if(fault)fault(e.message); }
        });
    }
    function oauth(grant,fields,done) {
        var data={grant_type:grant,client_id:options.clientId,client_secret:options.clientSecret};
        Object.keys(fields || {}).forEach(function(k){data[k]=fields[k];});
        raw('POST',grant==='refresh_token'?'/oauth2/token':'/oauth2/device',null,data,done);
    }
    function tokenSet(data) {
        if(typeof data.access_token!=='string' || !data.access_token ||
            typeof data.refresh_token!=='string' || !data.refresh_token || !(Number(data.expires_in)>0)) throw new Error('upstream_bad_token');
        return {access:data.access_token,refresh:data.refresh_token,expiresAt:now()+Number(data.expires_in)*1000};
    }
    function refresh(s,done) {
        s.refreshInFlight=true;save(s);
        oauth('refresh_token',{refresh_token:s.tokens.refresh},function(err,data) {
            if(err) {
                delete s.refreshInFlight;s.lastError=err;
                s.state=['invalid_grant','invalid_refresh_token','authorization_expired','expired_token','unauthorized','invalid_token','access_denied'].indexOf(err)>=0?'link_required':err==='invalid_client'?'configuration_error':'refresh_uncertain';
                try { save(s); } catch(e) { return done(e.message); }
                return done(err);
            }
            try { s.tokens=tokenSet(data);delete s.refreshInFlight;delete s.lastError;
                s.state='linked';s.rotations++;s.lastRefreshAt=now();save(s); }
            catch(e) { return done(e.message); }
            done();
        });
    }
    function api(s,method,path,params,done) {
        if(s.state!=='linked' || !s.tokens) return done(s.state==='refresh_uncertain'?'refresh_uncertain':s.state==='configuration_error'?'invalid_client':'link_required');
        var refreshed=false;
        function request() {
            var query=method==='GET'?assign({},params):{};
            query.access_token=s.tokens.access;
            raw(method,'/v1/'+path,query,method==='POST'?params:null,function(err,data) {
                if(err!=='unauthorized' && err!=='invalid_token') return done(err,data);
                if(refreshed) {s.state='link_required';s.lastError='unauthorized';save(s);return done('link_required');}
                refreshed=true;
                refresh(s,function(error){if(error)done(error);else request();});
            });
        }
        if(s.tokens.expiresAt-now()<60000) {
            refreshed=true;refresh(s,function(err){if(err)done(err);else request();});
        } else request();
    }
    function notify(s,done) {
        api(s,'POST','device/notify',{title:'RMediaHub · Lampa',hardware:'Lampa',software:'RMediaHub Direct/0.3.3'},function(err) {
            s.notifyError=err || null;save(s);done(null,snapshot(s));
        });
    }
    function restore(s,done) {
        if(s.state==='configuration_error' && s.tokens) {s.state='linked';save(s);}
        if(s.state!=='linked') return done(null,snapshot(s));
        api(s,'GET','user',{},function(err) {if(err)return done(err);notify(s,done);});
    }
    function start(s,done) {
        if(s.state==='linked') return done('already_linked');
        if(s.pending && s.pending.expiresAt>now()) return done(null,snapshot(s));
        oauth('device_code',{},function(err,d) {
            if(err) return done(err);
            if(!verification(d.verification_uri) || typeof d.code!=='string' || !d.code ||
                typeof d.user_code!=='string' || d.user_code.length>64 || !(Number(d.expires_in)>0) || !(Number(d.interval)>0)) return done('upstream_bad_response');
            var qr=verification(d.verification_uri_complete)?d.verification_uri_complete:d.verification_uri;
            s.pending={code:d.code,userCode:d.user_code,verificationUri:d.verification_uri,qrUri:qr,
                expiresAt:now()+Number(d.expires_in)*1000,interval:Math.max(1,Number(d.interval)),
                nextPollAt:now()+Number(d.interval)*1000};
            s.state='pending';delete s.lastError;save(s);done(null,snapshot(s));
        });
    }
    function poll(s,done) {
        if(s.state==='linked') return done(null,snapshot(s));
        if(!s.pending || s.pending.expiresAt<=now()) {
            delete s.pending;s.state='unlinked';save(s);return done('code_expired');
        }
        if(s.pending.nextPollAt>now()) return done(null,assign(snapshot(s),{retryAfter:Math.ceil((s.pending.nextPollAt-now())/1000)}));
        s.pending.nextPollAt=now()+s.pending.interval*1000;save(s);
        oauth('device_token',{code:s.pending.code},function(err,d) {
            if(err) {
                if(err==='slow_down' || err==='upstream_rate_limit') {s.pending.interval+=5;s.pending.nextPollAt=now()+s.pending.interval*1000;}
                else if(['authorization_pending','network','upstream_unreachable','upstream_error','upstream_bad_response'].indexOf(err)<0) {
                    s.state='unlinked';delete s.pending;s.lastError=err;save(s);return done(err);
                }
                save(s);return done(null,assign(snapshot(s),{retryAfter:s.pending.interval}));
            }
            try {s.tokens=tokenSet(d);} catch(e) {
                delete s.pending;s.state='link_required';s.lastError=e.message;save(s);return done(e.message);
            }
            delete s.pending;delete s.lastError;s.state='linked';save(s);
            // Identification is best-effort; authentication is already durably saved.
            notify(s,done);
        });
    }
    function videos(item) {
        var result=[];
        if(Array.isArray(item.seasons)) item.seasons.forEach(function(season,si) {
            (season.episodes || season.videos || []).forEach(function(v,vi) {
                result.push({key:'s'+si+'e'+vi,title:(season.title || 'Сезон '+(si+1))+' · '+(v.title || 'Серия '+(vi+1)),
                    season:Number(season.number) || si+1,episode:Number(v.number) || vi+1,video:v});
            });
        });
        else (item.videos || []).forEach(function(v,i){result.push({key:'v'+i,title:v.title || 'Видео '+(i+1),video:v});});
        return result;
    }
    function image(value) { return https(typeof value==='string'?value.replace(/^http:\/\//i,'https://'):''); }
    function text(value) { return typeof value==='string'?value.slice(0,1000):''; }
    function titleParts(value) { return text(value).split(/\s*\/\s*/).filter(function(v){return !!v;}); }
    function normal(value) {
        var v=text(value).toLowerCase().replace(/ё/g,'е');
        if(v.normalize) v=v.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        return v.replace(/[^a-zа-яіїєґ0-9]+/g,' ').trim();
    }
    function id(value) { return String(value || '').replace(/^tt/i,'').replace(/^0+/,''); }
    function catalogItem(v) {
        return {id:v.id,title:text(v.title),type:v.type,year:Number(v.year) || null,
            imdb:v.imdb || null,kinopoisk:v.kinopoisk || null,quality:v.quality || null,
            poster:image(v.posters && (v.posters.medium || v.posters.big || v.posters.small)),plot:text(v.plot)};
    }
    function find(s,body,done) {
        var card=body.movie || {}, queries=[], found=[], seen={};
        function add(q) {q=text(q).trim().slice(0,150);if(q && queries.indexOf(q)<0)queries.push(q);}
        if(body.query) add(body.query);
        else {add(titleParts(card.title || card.name)[0]);add(card.original_title || card.original_name);}
        if(!queries.length)return done('search_title_missing');
        var names=[card.title,card.name,card.original_title,card.original_name].reduce(function(a,v){return a.concat(titleParts(v).map(normal));},[]);
        var year=Number(String(card.release_date || card.first_air_date || card.year || '').slice(0,4));
        var cardType=String(card.type || card.media_type || '').toLowerCase();
        var serial=card.media_type==='tv' || /^(serial|docuserial|tvshow)$/.test(cardType) || !!(card.name && !card.title);
        var requested3d=cardType==='3d';
        function finish() {
            found.forEach(function(v) {
                var sameId=(id(card.imdb_id || card.imdb) && id(card.imdb_id || card.imdb)===id(v.imdb)) ||
                    (id(card.kinopoisk_id || card.kinopoisk) && id(card.kinopoisk_id || card.kinopoisk)===id(v.kinopoisk));
                var conflict=!sameId && ((id(card.imdb_id || card.imdb) && id(v.imdb) && id(card.imdb_id || card.imdb)!==id(v.imdb)) ||
                    (id(card.kinopoisk_id || card.kinopoisk) && id(v.kinopoisk) && id(card.kinopoisk_id || card.kinopoisk)!==id(v.kinopoisk)));
                var exact=titleParts(v.title).map(normal).some(function(n){return !!n && names.indexOf(n)>=0;});
                var type=String(v.type || '').toLowerCase();
                var rightType=serial?/^(serial|docuserial|tvshow)$/.test(type):requested3d?type==='3d':!!type && type!=='3d' && !/^(serial|docuserial|tvshow)$/.test(type);
                var typeScore=rightType?((type==='movie' || type==='serial' || requested3d)?40:20):-100;
                v.autoEligible=rightType;
                v.score=(sameId?1000:0)+(exact?100:0)+(year && year===v.year?30:0)+typeScore-(conflict?500:0);
                v.confident=rightType && (!!sameId || !!(!conflict && exact && year && year===v.year && !body.query));
            });
            found.sort(function(a,b){
                if(a.autoEligible!==b.autoEligible)return a.autoEligible?-1:1;
                return b.score-a.score || (parseInt(b.quality,10)||0)-(parseInt(a.quality,10)||0);
            });
            var top=found[0], tied=top && found.filter(function(v){return v.autoEligible===top.autoEligible && v.score===top.score;});
            var sameIdentity=top && tied.every(function(v){return (id(top.imdb) && id(top.imdb)===id(v.imdb)) || (id(top.kinopoisk) && id(top.kinopoisk)===id(v.kinopoisk));});
            done(null,{items:found,bestId:top && top.confident && (tied.length===1 || sameIdentity)?top.id:null,query:queries[0]});
        }
        function next(index) {
            if(index>=queries.length)return finish();
            api(s,'GET','items/search',{q:queries[index],field:'title',perpage:50,page:1},function(err,data) {
                if(err)return done(err);
                (data.items || []).forEach(function(v){if(/^\d+$/.test(String(v.id)) && !seen[v.id]){seen[v.id]=true;found.push(catalogItem(v));}});
                next(index+1);
            });
        }
        next(0);
    }
    function audios(video) {
        return (video.audios || []).map(function(a,position) {
            var lang=text(a.lang).toLowerCase(), type=text(a.type && a.type.title), author=text(a.author && a.author.title);
            var key=a.id!=null?'id:'+a.id:'index:'+(a.index!=null?a.index:position);
            var streamIndex=/^\d+$/.test(String(a.index))?Number(a.index):null;
            if(!(streamIndex>0 && streamIndex<=9999 && Math.floor(streamIndex)===streamIndex))streamIndex=null;
            return {key:key,id:a.id,index:a.index!=null?Number(a.index):position,streamIndex:streamIndex,position:position,
                lang:lang,type:type,author:author,codec:text(a.codec).toUpperCase(),channels:Number(a.channels) || null,
                label:((type || 'Озвучка')+' '+(author || lang.toUpperCase())).trim()};
        }).sort(function(a,b){return a.index-b.index;}).map(function(a,i){a.position=i;return a;});
    }
    function itemDetail(item,itemId,full) {
        return {id:String(item.id || itemId),requestedId:String(itemId),audioMode:full?'full':'compact',
            declaredAudios:Number(item.langs) || null,title:text(item.title),type:item.type,year:item.year,quality:item.quality || null,
            poster:image(item.posters && (item.posters.medium || item.posters.big)),plot:text(item.plot),
            videos:videos(item).map(function(v){return {key:v.key,title:v.title,season:v.season || null,episode:v.episode || null,
                duration:Number(v.video.duration)||0,thumbnail:image(v.video.thumbnail),audios:audios(v.video),
                quality:v.video.quality || item.quality || null};})};
    }
    function play(s,body,done) {
        if(!/^\d+$/.test(String(body.itemId)) || !/^(v\d+|s\d+e\d+)$/.test(body.videoKey || '')) return done('bad_play_request');
        var full=!!body.fullAudio || /^v\d+$/.test(body.videoKey);
        api(s,'GET','items/'+body.itemId,{nolinks:full?0:1},function(err,data) {
            if(err)return done(err);
            var item=data.item || {}, selected=videos(item).filter(function(v){return v.key===body.videoKey;})[0];
            if(!selected)return done('video_missing');
            var voices=audios(selected.video), audio=null;
            if(body.audioKey) {
                audio=voices.filter(function(v){return v.key===body.audioKey;})[0];
                if(!audio)return done('voice_missing');
            }
            function linksReady(error,links) {
                if(error)return done(error);
                var requested=/^(hls4|hls2|hls|http)$/.test(body.stream || '')?body.stream:'auto';
                var formats=requested==='auto'?(body.platform==='tizen'?['hls','hls2']:['hls4']):[requested];
                if(requested==='auto' && (!audio || voices.length<=1) && body.platform!=='tizen')formats=formats.concat(['hls','hls2','http']);
                var qualities=(links.files || []).map(function(f) {
                    var urls=f.urls || f.url || {};
                    var url='',stream='',locked=false;
                    formats.some(function(type){
                        var candidate=https(urls[type]);
                        if(!candidate)return false;
                        var fixed=(type==='hls' || type==='hls2') && audio?rmediahubKinoPubAudioUrl(candidate,audio.streamIndex):'';
                        if((type==='hls' || type==='hls2') && audio && voices.length>1 && !fixed)return false;
                        url=fixed || candidate;stream=type;locked=!!fixed;return true;
                    });
                    return {label:String(f.quality || f.h || 'Auto')+' · '+String(f.codec || 'video'),
                        height:Number(f.h) || parseInt(f.quality,10) || 0,codec:String(f.codec || ''),url:url,stream:stream,audioLocked:locked};
                }).filter(function(f){return !!f.url;});
                qualities.sort(function(a,b){return b.height-a.height || (a.codec==='h264'?0:1)-(b.codec==='h264'?0:1);});
                if(!qualities.length)return done(audio && voices.length>1?(formats[0]==='hls4'?'multiaudio_unavailable':'selected_stream_unavailable'):'no_https_streams');
                done(null,{title:(item.title || '')+' · '+selected.title,qualities:qualities,
                    audio:audio,audios:voices,videoKey:selected.key,itemId:body.itemId,
                    subtitles:(links.subtitles || []).filter(function(v){return !!https(v.url);}).map(function(v){return {url:v.url,label:v.lang || 'Subtitles'};})});
            }
            if(selected.video.id)api(s,'GET','items/media-links',{mid:selected.video.id},linksReady);
            else if(selected.video.files && selected.video.files.length)linksReady(null,selected.video);
            else api(s,'GET','items/'+body.itemId,{nolinks:0},function(error,legacy){
                if(error)return done(error);
                var v=videos(legacy.item || {}).filter(function(v){return v.key===body.videoKey;})[0];
                if(!v)return done('video_missing');linksReady(null,v.video);
            });
        });
    }
    function audioDiagnostics(s,body,done) {
        var itemId=String(body.itemId || ''),videoKey=String(body.videoKey || 'v0');
        if(!/^\d+$/.test(itemId) || !/^(v\d+|s\d+e\d+)$/.test(videoKey))return done('bad_play_request');
        var result={plugin:'0.3.3',api:HOST,itemId:itemId,videoKey:videoKey,counts:{compact:null,full:null}};
        function summarize(data,full) {
            var item=data.item || {}, all=videos(item), selected=all.filter(function(v){return v.key===videoKey;})[0];
            var video=selected?selected.video:{};
            return {mode:full?'full':'compact',requestedId:itemId,apiItemId:item.id || null,title:text(item.title),
                year:item.year || null,type:item.type || null,declaredAudios:Number(item.langs) || null,
                videoCount:all.length,videoFound:!!selected,audioCount:audios(video).length,audios:audios(video),
                files:(video.files || []).map(function(f){var urls=f.urls || f.url || {};return {quality:f.quality || f.h || null,codec:text(f.codec),
                    hls4:!!https(urls.hls4),hls:!!https(urls.hls),hls2:!!https(urls.hls2),http:!!https(urls.http),
                    perVoiceHls:!!rmediahubKinoPubAudioUrl(urls.hls,1)};})};
        }
        api(s,'GET','items/'+itemId,{nolinks:1},function(err,data){
            result.compact=err?{error:err}:summarize(data,false);
            result.counts.compact=err?null:result.compact.audioCount;
            api(s,'GET','items/'+itemId,{nolinks:0},function(error,data){
                result.full=error?{error:error}:summarize(data,true);
                result.counts.full=error?null:result.full.audioCount;
                api(s,'GET','device/info',{},function(fault,data){
                    if(fault)result.device={error:fault};
                    else {
                        var settings=(data.device || data).settings || {}, safe={};
                        ['supportSsl','useSsl','supportHevc','supportHdr','support4k','mixedPlaylist','streamingType'].forEach(function(k){
                            var value=settings[k];
                            if(value && typeof value==='object')value=value.value;
                            if(typeof value==='boolean' || typeof value==='number')safe[k]=value;
                            else if(typeof value==='string' && /^(true|false|\d+)$/.test(value))safe[k]=value;
                        });result.device={settings:safe,availableSettings:Object.keys(settings).filter(function(k){return /^[a-zA-Z0-9_-]{1,60}$/.test(k);}).slice(0,40)};
                    }
                    done(null,result);
                });
            });
        });
    }
    function perform(method,path,body,done) {
        if(path==='/api/session/forget') {storage.removeItem(KEY);return done(null,{forgotten:true});}
        var s=read(), at=path.indexOf('?'), query={}, clean=at>=0?path.slice(0,at):path;
        if(s.refreshInFlight) {delete s.refreshInFlight;s.state='refresh_uncertain';save(s);}
        if(at>=0) path.slice(at+1).split('&').forEach(function(pair) {
            var p=pair.split('=');query[decodeURIComponent(p[0])]=decodeURIComponent(p.slice(1).join('=') || '');
        });
        if(clean==='/api/status')return done(null,snapshot(s));
        if(clean==='/api/restore')return restore(s,done);
        if(clean==='/api/link/start')return start(s,done);
        if(clean==='/api/link/poll')return poll(s,done);
        if(clean==='/api/link/cancel') {
            delete s.pending;if(s.state==='pending')s.state='unlinked';save(s);return done(null,snapshot(s));
        }
        if(clean==='/api/items') {
            var params={page:Math.max(1,Number(query.page)||1),perpage:30};
            if(query.type) params.type=query.type;
            if(query.q) {params.q=query.q.slice(0,150);params.field='title';} else params.sort='updated-';
            return api(s,'GET',query.q?'items/search':'items',params,function(err,data) {
                if(err)return done(err);
                done(null,{items:(data.items || []).map(catalogItem),
                    pagination:data.pagination || {current:params.page,total:params.page}});
            });
        }
        var match=clean.match(/^\/api\/items\/(\d+)$/);
        if(match)return api(s,'GET','items/'+match[1],{nolinks:query.full==='1'?0:1},function(err,data){
            if(err)return done(err);
            done(null,itemDetail(data.item || {},match[1],query.full==='1'));
        });
        if(clean==='/api/audio/diagnostics')return audioDiagnostics(s,body,done);
        if(clean==='/api/watch/find')return find(s,body,done);
        if(clean==='/api/play')return play(s,body,done);
        done('not_found');
    }
    function pump() {
        if(working || !queue.length)return;
        working=true;
        var job=queue.shift(), started=now(), timer, settled=false;
        function finish(err,data) {
            if(settled)return;settled=true;
            held=false;clear(timer);
            var l=lease();if(l && l.owner===owner)storage.removeItem(LOCK);
            working=false;currentFinish=null;
            try {if(!job.cancelled)job.done(err,data);} finally {pump();}
        }
        function acquire() {
            var l=lease();
            if(l && l.owner!==owner && l.expiresAt>now()) {
                if(now()-started>60000){working=false;if(!job.cancelled)job.done('session_busy');pump();return;}
                timer=delay(acquire,150);return;
            }
            try {storage.setItem(LOCK,JSON.stringify({owner:owner,expiresAt:now()+120000}));}
            catch(e) {working=false;if(!job.cancelled)job.done('local_storage_unavailable');pump();return;}
            timer=delay(function() {
                if(!lease() || lease().owner!==owner)return acquire();
                held=true;
                currentFinish=finish;
                try {perform(job.method,job.path,job.body,finish);}
                catch(e) {finish(e.message);}
            },20+Math.floor(Math.random()*30));
        }
        acquire();
    }
    return {
        request:function(method,path,body,done) {
            var job={method:method,path:path,body:body || {},done:done,cancelled:false};
            queue.push(job);pump();
            // A UI cancellation must not abort token rotation or discard its result.
            return {abort:function(){job.cancelled=true;}};
        }
    };
}

// KinoPub's legacy HLS endpoint exposes one audio per a{API index}.m3u8 playlist.
// Change only that known terminal filename; preserve the signed query verbatim.
function rmediahubKinoPubAudioUrl(url,index) {
    if(typeof url!=='string' || !/^https:\/\//i.test(url) || /^https:\/\/[^/?#]*@/i.test(url))return '';
    if(!(typeof index==='number' && index>0 && index<=9999 && Math.floor(index)===index))return '';
    var parts=url.match(/^([^?#]*)([?#].*)?$/);
    if(!parts || !/\/a[1-9]\d*\.m3u8$/i.test(parts[1]))return '';
    return parts[1].replace(/\/a[1-9]\d*\.m3u8$/i,'/a'+index+'.m3u8')+(parts[2] || '');
}

function parseRMediaHubKinoPubLink(value) {
    var match=String(value || '').trim().match(/^https:\/\/(?:kino\.watch|kino\.pub)\/item\/(?:view\/)?(\d+)(?:\/s(\d+)e(\d+))?(?:[?#][^\s]*)?\/?$/i);
    return match?{itemId:match[1],season:match[2]!=null?Number(match[2]):null,episode:match[3]!=null?Number(match[3]):null}:null;
}

// Match against the actual tracks exposed by Lampa's player, then enable its native setter.
// KinoPub's media index is not assumed to be an AVPlay or hls.js array index.
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

(function () {
    'use strict';
    if (window.rmediahub_kinopub_direct_loaded) return;
    if (!window.Lampa || !window.jQuery) return;
    window.rmediahub_kinopub_direct_loaded = true;
    var L = window.Lampa, $ = window.jQuery;
    var BASE = 'https://api.service-kp.com';
    var ready = false, authGeneration = 0, authTimer = null, lastPlayback = null;
    var icon = '<svg viewBox="0 0 44 44" width="44" height="44" fill="none"><rect x="3" y="7" width="38" height="29" rx="7" stroke="currentColor" stroke-width="3"/><path d="M18 14l13 8-13 8z" fill="currentColor"/></svg>';
    var messages = {
        session_busy: 'Другая вкладка RMediaHub обновляет сессию. Повторите позже.',
        link_required: 'KinoPub требует новую привязку RMediaHub.',
        refresh_uncertain: 'Результат обновления неизвестен. Нужна новая привязка RMediaHub.',
        upstream_unreachable: 'KinoPub временно недоступен. Сессия сохранена.',
        upstream_rate_limit: 'KinoPub ограничил запросы. Повторите позже.',
        invalid_client: 'KinoPub отклонил публичный клиент. Потребуется обновление плагина.',
        code_expired: 'Код истёк. Получите новый.',
        access_denied: 'Привязка отклонена на стороне KinoPub.',
        no_https_streams: 'KinoPub не вернул подходящих HTTPS потоков.',
        local_storage_unavailable: 'Хранилище Lampa недоступно. Сессию нельзя сохранить.',
        already_linked: 'KinoPub уже подключён. Для проверки выберите «Восстановить сессию».',
        voice_missing: 'Эта дорожка больше не доступна. Обновите список озвучек.',
        video_missing: 'Видео пока не доступно в KinoPub.',
        multiaudio_unavailable: 'KinoPub не вернул HLS4 с выбором дорожек для этого видео.',
        selected_stream_unavailable: 'KinoPub не вернул HLS с точным выбором этой озвучки. Проверьте воспроизведение через меню «Источник».',
        search_title_missing: 'В карточке нет названия для поиска.',
        network: 'Нет прямого соединения с KinoPub. Проверьте сеть и доступность API.'
    };
    function stateLabel(data) {
        var labels = { linked:'KinoPub подключён', pending:'Ожидается подтверждение кода',
            unlinked:'KinoPub ещё не привязан', link_required:'Требуется новая привязка KinoPub',
            configuration_error:'KinoPub отклонил клиент приложения',
            refresh_uncertain:'Обновление не подтверждено. Требуется новая привязка.' };
        return labels[data.state] || 'Проверьте состояние в диагностике';
    }
    function xhrTransport(method, url, body, done) {
        var xhr=new XMLHttpRequest(), finished=false;
        function end(error,data){if(!finished){finished=true;done(error,data);}}
        xhr.open(method,url,true);xhr.timeout=15000;
        if(body!==null)xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
        xhr.onload=function(){
            var data;try{data=JSON.parse(xhr.responseText);}catch(e){return end('upstream_bad_response');}
            if(xhr.status===401)return end('unauthorized');
            if(xhr.status===429)return end('upstream_rate_limit');
            if(xhr.status>=500)return end('upstream_unreachable');
            if(xhr.status>=400 && !data.error && !data.status)return end('upstream_error');
            end(null,data);
        };
        xhr.onerror=xhr.ontimeout=function(){end('network');};
        xhr.onabort=function(){end('network');};
        xhr.send(body);
    }
    var Direct=createRMediaHubDirect({storage:localStorage,transport:xhrTransport,
        clientId:"xbmc",clientSecret:"cgg3gtifu46urtfp2zp1nqtba0k2ezxh"});
    function request(method,path,body,done){return Direct.request(method,path,body,done);}
    function toast(error) { L.Noty.show(messages[error] || ('RMediaHub: ' + error)); }
    function platform() {
        var names=['tizen','webos','android','apple','orsay'], found='browser';
        if(L.Platform && L.Platform.is)names.some(function(name){if(L.Platform.is(name)){found=name;return true;}return false;});
        if(found==='browser' && /tizen/i.test(navigator.userAgent || ''))found='tizen';
        return found;
    }
    function playbackDiagnostics() {
        var player=String(L.Storage.field('player') || '').replace(/[^a-z0-9_-]/gi,'').slice(0,30);
        var report={plugin:'0.3.3',platform:platform(),player:player,
            format:L.Storage.field('rmediahub_kinopub_format') || 'auto',lastPlayback:lastPlayback};
        L.Modal.open({title:'KinoPub · Проверка воспроизведения',html:$('<pre class="rmhd-report"></pre>').text(JSON.stringify(report,null,2)),
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
    function link(onLinked) {
        stopAuth();
        var generation = authGeneration;
        request('POST', '/api/link/start', {}, function (error, data) {
            if (generation !== authGeneration) return;
            if (error) return toast(error);
            var p = data.pending;
            if (!p) return toast('code_expired');
            var html = $('<div class="rmhd-pair"></div>');
            var qr = $('<div class="rmhd-qr"></div>').appendTo(html);
            try {
                var code = RMediaHubQR(0, 'M');
                code.addData(p.qrUri); code.make();
                qr.html(code.createSvgTag(5, 20));
            } catch (e) { qr.text('Введите код вручную'); }
            var info = $('<div></div>').appendTo(html);
            $('<h2></h2>').text('Привязка KinoPub').appendTo(info);
            $('<p></p>').text('Откройте адрес или отсканируйте QR:').appendTo(info);
            $('<p class="rmhd-uri"></p>').text(p.verificationUri).appendTo(info);
            $('<p></p>').text('Введите код:').appendTo(info);
            $('<div class="rmhd-code"></div>').text(p.userCode).appendTo(info);
            $('<p></p>').text('QR открывает KinoPub. Если код не заполнен, введите его вручную.').appendTo(info);
            var status = $('<p></p>').text('Ожидаем подтверждения…').appendTo(info);
            var buttons = [{ name: 'Закрыть', onSelect: closeAuth }, {
                name: 'Отменить код', onSelect: function () {
                    closeAuth();
                    request('POST','/api/link/cancel',{},function (err) { if (err) toast(err); });
                }
            }];
            L.Modal.open({title:'RMediaHub · KinoPub',html:html,size:'large',buttons:buttons,onBack:closeAuth});
            function schedule(seconds) { authTimer = setTimeout(poll, Math.max(1, seconds) * 1000); }
            function poll() {
                if (generation !== authGeneration) return;
                if (Date.now() >= p.expiresAt) { status.text('Код истёк. Закройте окно и получите новый.'); return; }
                request('POST','/api/link/poll',{},function (err, next) {
                    if (generation !== authGeneration) return;
                    if (err) {
                        status.text(messages[err] || ('RMediaHub: '+err));
                        if (err === 'network' || err === 'upstream_unreachable') schedule(10);
                        return;
                    }
                    if (next.linked) { closeAuth(); $('.rmhd-state').text('KinoPub подключён'); L.Noty.show('KinoPub привязан к RMediaHub'); if(typeof onLinked==='function')onLinked(); return; }
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
                plugin:'RMediaHub 0.3.3', api:BASE, connection:'direct', lampa:L.Manifest.app_version,
                state:data.state, expiresAt:data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
                lastRefreshAt:data.lastRefreshAt ? new Date(data.lastRefreshAt).toISOString() : null,
                rotations:data.rotations, lastError:data.lastError, notifyError:data.notifyError,
                pending:!!data.pending, direct:true,platform:platform(),lastPlayback:lastPlayback
            };
            L.Modal.open({title:'RMediaHub · Диагностика',html:$('<pre class="rmhd-report"></pre>').text(JSON.stringify(report,null,2)),size:'large',
                onBack:function () { L.Modal.close(); focus(); }});
        });
    }
    function restore(done) {
        return request('POST','/api/restore',{},function (error,data) {
            // A network failure never deletes locally stored tokens.
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
                L.Noty.show('Сессия RMediaHub удалена. Запись устройства KinoPub не удалялась.');
                focus();
            });
        });
    }
    function openSource(movie) {
        if(movie && (movie.title || movie.name))return openWatch(movie);
        L.Activity.push({url:'',title:'RMediaHub · KinoPub',component:'rmediahub_kinopub_source',movie:movie || null,page:1});
    }
    function openWatch(movie,itemId) {
        L.Select.close();
        L.Activity.push({url:'',title:'RMediaHub · KinoPub',component:'rmediahub_kinopub_watch',
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
        var root=files.render().addClass('rmhd-watch'), scroll=new L.Scroll({mask:true,over:true});
        var body=$('<div class="rmhd-watch-body"></div>'), bar=$('<div class="rmhd-tools"></div>'), rows=$('<div class="rmhd-rows"></div>');
        var meta=$('<div class="rmhd-movie-meta"></div>').text(year).appendTo(root.find('.files__info'));
        $('<div class="rmhd-plot"></div>').text(card.overview || card.plot || '').appendTo(root.find('.files__info'));
        var state=$('<div class="rmhd-watch-state"></div>');
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
            var el=$('<div class="simple-button simple-button--filter selector rmhd-tool"><span></span><div></div></div>');
            el.find('span').text(label);el.find('div').text(value || '').toggleClass('hide',!value);
            el.on('hover:enter',action);trackFocus(el);bar.append(el);return el;
        }
        function error(err) {
            loading(false);rows.empty();state.text(messages[err] || ('Ошибка KinoPub: '+err));
            action('Повторить поиск',function(){find();});
            if(err==='link_required' || err==='refresh_uncertain')action('Привязать KinoPub',function(){link(function(){find();});});
            else action('Настройки KinoPub',function(){openSource();});
            activate();
        }
        function action(label,fn) {
            var el=$('<div class="rmhd-action selector"></div>').text(label).on('hover:enter',fn);
            rows.append(trackFocus(el));return el;
        }
        function timeline(v) {
            var hash=L.Utils.hash('rmediahub:kinopub:'+detail.id+':'+v.key);
            return L.Timeline.view(hash,L.Timeline.link?L.Timeline.link(card,v.season,v.episode):null);
        }
        function qualityLabel(value) {
            var number=parseInt(value,10);return number>=2160?'4K':number?number+'p':String(value || '');
        }
        function currentVoices() {
            if(!video)return [];
            return video.audios && video.audios.length?video.audios:[{key:'',label:'Озвучка по умолчанию',lang:'',codec:''}];
        }
        function openKinoPubLink() {
            input('Ссылка на фильм KinoPub',false,function(value){
                var parsed=parseRMediaHubKinoPubLink(value);
                if(!parsed)return L.Noty.show('Введите ссылку вида https://kino.watch/item/view/127780/s0e1');
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
                var html=$('<div class="rmhd-report"></div>');
                $('<p></p>').text('Карточка KinoPub: '+report.itemId+(automaticItemId?' · Найдена автоматически: '+automaticItemId:'')).appendTo(html);
                $('<h2></h2>').text('Обычный запрос: '+(report.counts.full==null?'ошибка':report.counts.full+' дорожек')).appendTo(html);
                $('<p></p>').text('Облегчённый запрос: '+(report.counts.compact==null?'ошибка':report.counts.compact+' дорожек')).appendTo(html);
                $('<pre></pre>').text(JSON.stringify(report,null,2)).appendTo(html);
                L.Modal.open({title:'KinoPub · Проверка озвучек',html:html,size:'large',
                    onBack:function(){L.Modal.close();activate();}});
            });
        }
        function rebuildTools() {
            bar.empty();
            tool('Поиск',title,function(){input('Уточнить название в KinoPub',false,function(q){find(q);});});
            tool('Источник','KinoPub',function(){
                var items=[{title:'KinoPub',selected:true},{title:'Открыть ссылку KinoPub',open:true}];
                if(detail)items.push({title:'Обновить озвучки',reload:true},{title:'Проверить озвучки',diagnostics:true});
                items.push({title:'Проверить воспроизведение',playback:true});
                choose('Источник',items,function(a){if(a.open)openKinoPubLink();else if(a.reload)loadItem(detail.id,true);else if(a.diagnostics)checkAudios();else if(a.playback)playbackDiagnostics();else activate();});
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
                var row=$('<div class="rmhd-voice selector"><div class="rmhd-voice-image"><img/><span>▶</span></div><div class="rmhd-voice-body"><div class="rmhd-voice-top"><strong></strong><small></small></div><div class="rmhd-progress"><div></div></div><div class="rmhd-voice-bottom"><span></span><b></b></div></div></div>');
                var thumbnail=video.thumbnail || poster(card,true) || poster(card) || detail.poster;
                row.find('img').attr('src',thumbnail).on('error',function(){$(this).hide();});
                row.find('strong').text(a.label);
                row.find('small').text(video.duration?Math.ceil(video.duration/60)+' мин':'');
                var formats=['KinoPub'];if(a.lang)formats.push(a.lang.toUpperCase());if(a.codec)formats.push(a.codec);
                if(a.channels)formats.push(a.channels===6?'5.1':a.channels===2?'2.0':a.channels+' ch');
                row.find('.rmhd-voice-bottom span').text(formats.join(' · '));
                row.find('b').text(qualityLabel(video.quality || detail.quality));
                var view=timeline(video);row.find('.rmhd-progress div').css('width',Math.max(0,Math.min(100,Number(view.percent)||0))+'%');
                row.on('hover:enter',function(){playVoice(a);});rows.append(trackFocus(row));
            });
            if(!list.length)action('Показать все озвучки',function(){language='';renderVoices();});
            if(candidates.length>1)action('Выбрать другое совпадение KinoPub',renderMatches);
            activate();
        }
        function playVoice(audio) {
            if(busy)return;
            var selectedVideo=video, selectedItem=detail.id;
            var requestedStream=L.Storage.field('rmediahub_kinopub_format') || 'auto';
            loading(true);
            lastPlayback={state:'requesting',itemId:selectedItem,videoKey:selectedVideo.key,platform:platform(),
                requestedStream:requestedStream,voice:audio.label,startedAt:new Date().toISOString()};
            call('POST','/api/play',{itemId:selectedItem,videoKey:selectedVideo.key,audioKey:audio.key,
                fullAudio:detail.audioMode==='full',platform:platform(),stream:requestedStream},function(err,media){
                loading(false);if(err){lastPlayback.state='request_error';lastPlayback.error=err;return toast(err);}
                lastPlayback.available=media.qualities.map(function(f){return {height:f.height,codec:f.codec,stream:f.stream,audioLocked:f.audioLocked};});
                lastPlayback.state='choosing_quality';
                function launch(file) {
                    lastPlayback.state='starting';lastPlayback.stream=file.stream;lastPlayback.height=file.height;
                    lastPlayback.codec=file.codec;lastPlayback.audioLocked=file.audioLocked;lastPlayback.audioIndex=media.audio?media.audio.streamIndex:null;
                    var playerAudios=file.audioLocked && media.audio?[media.audio]:media.audios;
                    var play={url:file.url,title:title+' · '+audio.label,
                        subtitles:media.subtitles,card:card,timeline:timeline(selectedVideo),
                        translate:{tracks:playerAudios.map(function(a){return {name:a.label,language:a.lang,extra:{channels:a.channels,fourCC:a.codec}};})},
                        rmhdAudio:file.audioLocked?null:media.audio,rmhdAudioCount:playerAudios.length,rmhdPlayback:lastPlayback};
                    // Array entries keep Player's global default from replacing the quality just chosen here.
                    if(media.qualities.length>1)play.quality=media.qualities.map(function(f){return {
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
            loading(true);state.text('Загружаем озвучки KinoPub…');rows.empty();
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
            state.text(candidates.length?'Выберите совпадение в KinoPub':'В KinoPub пока нет подходящего фильма. Можно уточнить название.');
            candidates.forEach(function(item){action(item.title+' · '+(item.year || '')+' · '+editionLabel(item.type)+' · '+qualityLabel(item.quality),function(){loadItem(item.id);});});
            if(!candidates.length)action('Уточнить название',function(){input('Поиск в KinoPub',false,function(q){find(q);});});
            activate();
        }
        function find(query) {
            generation++;detail=null;video=null;rows.empty();last=false;rebuildTools();loading(true);
            state.text('Ищем «'+title+'» в KinoPub…');
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
        var content=$('<div class="rmhd-screen"></div>');
        $('<div class="rmhd-brand">RMediaHub <small>KinoPub</small></div>').appendTo(content);
        var state=$('<p class="rmhd-state">Прямое подключение к KinoPub</p>').appendTo(content);
        function call(method,path,body,cb) {
            var xhr=request(method,path,body,function(err,data) { if(alive) cb(err,data); });
            requests.push(xhr); return xhr;
        }
        function button(title,description,fn) {
            var el=$('<div class="rmhd-action selector"><strong></strong><span></span></div>');
            el.find('strong').text(title); el.find('span').text(description || '');
            el.on('hover:focus',function(){last=el[0];scroll.update(el,true);});
            el.on('hover:enter',fn); content.append(el);
        }
        function list(q,type,page) {
                state.text('Загружаем KinoPub…');
            call('GET','/api/items?q='+encodeURIComponent(q || '')+'&type='+encodeURIComponent(type || '')+'&page='+page,null,function(err,data) {
                state.text(err ? (messages[err] || err) : 'RMediaHub · KinoPub');
                if(err) return toast(err);
                var items=data.items.map(function(item){return {title:escape(item.title),subtitle:escape((item.year || '')+' · '+editionLabel(item.type)),item:item};});
                var total=Number(data.pagination.total || page),current=Number(data.pagination.current || page);
                if(current>1) items.push({title:'← Предыдущая страница',page:current-1});
                if(current<total) items.push({title:'Следующая страница →',page:current+1});
                if(!items.length) items.push({title:'Ничего не найдено'});
                choose('RMediaHub · '+(q || 'Каталог'),items,function(a){
                    if(a.page) list(q,type,a.page);
                    else if(a.item) detail(a.item);
                    else focus();
                });
            });
        }
        function detail(item) {
            openWatch({id:item.id,title:item.title,poster:item.poster,plot:item.plot,year:item.year,source:'rmediahub_kinopub',type:item.type},item.id);
        }
        this.create=function() {
            if(object.movie) button('Найти: '+(object.movie.title || object.movie.name || ''),'Выберите совпадение из результатов KinoPub',function(){
                list((object.movie.title || object.movie.name || '').split(' / ')[0],'',1);
            });
            button('Свежие фильмы','Каталог KinoPub',function(){list('','movie',1);});
            button('Сериалы','Сезоны и серии',function(){list('','serial',1);});
            button('Поиск','По названию в KinoPub',function(){input('Поиск в KinoPub',false,function(q){list(q,'',1);});});
            button('Привязать KinoPub','Код и QR на официальном сайте',link);
            button('Восстановить сессию','Проверить доступ и обновить токены при необходимости',function(){
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
            '.rmhd-screen{padding:2em;max-width:76em}.rmhd-brand{font-size:2.3em;font-weight:700;color:#a5b4fc}' +
            '.rmhd-brand small{font-size:.5em;color:#94a3b8;margin-left:1em}.rmhd-state{margin:1em 0 1.5em;color:#cbd5e1}' +
            '.rmhd-action{padding:1em 1.2em;margin:.5em 0;background:#172033;border-radius:.6em;border:2px solid transparent}' +
            '.rmhd-action strong,.rmhd-action span{display:block}.rmhd-action span{font-size:.8em;opacity:.7;margin-top:.3em}' +
            '.rmhd-action.focus{border-color:#a5b4fc;background:#263355}.rmhd-pair{display:flex;gap:2em;align-items:center;padding:1em}' +
            '.rmhd-qr{background:white;padding:.4em;flex:0 0 34%;color:#111}.rmhd-qr svg{width:100%;height:auto;display:block}' +
            '.rmhd-uri{word-break:break-all;color:#a5b4fc}.rmhd-code{font-size:3em;letter-spacing:.15em;font-weight:700;margin:.3em 0}' +
            '.rmhd-report{white-space:pre-wrap;word-break:break-word;padding:1em}'
        ).appendTo('head');
        $('<style></style>').text(
            '.rmhd-watch{background:#000;min-height:100%}.rmhd-watch .full-start__poster{width:8em;height:12em;padding:0}' +
            '.rmhd-watch .full-start__poster img{width:100%;height:100%;object-fit:cover;display:block}' +
            '.rmhd-watch .files__info{padding-top:1em}.rmhd-watch .files__title{font-size:1.7em;font-weight:700;line-height:1.2}' +
            '.rmhd-movie-meta{margin:1em 0;opacity:.75}.rmhd-plot{line-height:1.5;font-size:.9em;max-height:26em;overflow:hidden}' +
            '.rmhd-watch-body{padding:.5em 1em 2em}.rmhd-tools{display:flex;flex-wrap:wrap;gap:.5em;margin-bottom:1em}' +
            '.rmhd-tool{margin:0;font-size:.9em}.rmhd-watch-state{opacity:.65;margin:0 0 1em;font-size:.9em}' +
            '.rmhd-voice{display:flex;align-items:center;gap:1.2em;padding:.4em;border:3px solid transparent;border-radius:.6em;margin:.3em 0}' +
            '.rmhd-voice.focus{border-color:var(--color-main,#fff);background:rgba(255,255,255,.06)}' +
            '.rmhd-voice-image{position:relative;flex:0 0 12em;height:7em;background:#253044;border-radius:.3em;overflow:hidden}' +
            '.rmhd-voice-image img{width:100%;height:100%;object-fit:cover}.rmhd-voice-image span{position:absolute;top:.5em;left:.5em;background:rgba(0,0,0,.55);border-radius:50%;padding:.3em .5em}' +
            '.rmhd-voice-body{flex:1;min-width:0}.rmhd-voice-top,.rmhd-voice-bottom{display:flex;justify-content:space-between;gap:1em;align-items:center}' +
            '.rmhd-voice-top strong{font-size:1.5em;font-weight:400;line-height:1.2}.rmhd-voice-top small{white-space:nowrap;opacity:.8}' +
            '.rmhd-voice-bottom{margin-top:.6em;font-size:.8em}.rmhd-voice-bottom b{font-weight:400;white-space:nowrap}' +
            '.rmhd-progress{height:.25em;background:rgba(255,255,255,.28);margin-top:1em;border-radius:1em}.rmhd-progress div{height:100%;background:#fff;border-radius:1em}' +
            '@media(max-width:580px){.rmhd-voice-image{flex-basis:7em;height:4.7em}.rmhd-voice-top strong{font-size:1.15em}.rmhd-voice-top small{display:none}.rmhd-plot{max-height:7em}.rmhd-watch-body{padding:.5em}}'
        ).appendTo('head');
        L.Component.add('rmediahub_kinopub_source',Source);
        L.Component.add('rmediahub_kinopub_watch',Watch);
        var pendingAudio=null,activePlayback=null;
        if(L.PlayerVideo && L.PlayerVideo.listener) {
            L.Player.listener.follow('start',function(data){
                pendingAudio=data.rmhdAudio?{audio:data.rmhdAudio,count:data.rmhdAudioCount,applied:false}:null;
                activePlayback=data.rmhdPlayback || null;
            });
            L.Player.listener.follow('destroy',function(){pendingAudio=null;activePlayback=null;});
            L.PlayerVideo.listener.follow('timeupdate',function(e){
                if(activePlayback && Number(e.current)>0){activePlayback.state='playing';activePlayback.current=Math.floor(Number(e.current));}
            });
            L.PlayerVideo.listener.follow('error',function(e){
                if(!activePlayback)return;
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
        window.Lampa.Manifest.plugins={type:'video',version:'0.3.3',name:'RMediaHub KinoPub',description:'Прямой KinoPub без BWA',
            component:'rmediahub_kinopub_source',onContextMenu:function(){return {name:'Смотреть в RMediaHub · KinoPub',description:''};},
            onContextLauch:openSource};
        L.SettingsApi.addComponent({component:'rmediahub_kinopub',name:'RMediaHub · KinoPub',icon:icon});
        L.SettingsApi.addParam({component:'rmediahub_kinopub',param:{name:'rmediahub_kinopub_open',type:'button'},
            field:{name:'Открыть RMediaHub',description:'KinoPub · привязка, поиск и диагностика'},onChange:function(){openSource();}});
        L.SettingsApi.addParam({component:'rmediahub_kinopub',param:{name:'rmediahub_kinopub_format',type:'select',
            values:{auto:'Автоматически',hls4:'HLS4 · все дорожки',hls:'HLS · выбранная озвучка',hls2:'HLS2 · выбранная озвучка',http:'MP4 HTTPS'},default:'auto'},
            field:{name:'Тип потока KinoPub',description:'Авто: Samsung — HLS с выбранной озвучкой; остальные устройства — HLS4.'}});
        var menu=$('<li class="menu__item selector"><div class="menu__ico">'+icon+'</div><div class="menu__text">RMediaHub · KinoPub</div></li>');
        menu.on('hover:enter',function(){openSource();});
        $('.menu .menu__list').eq(0).append(menu);
        L.Listener.follow('full',function(e){
            if(e.type!=='complite' || !e.body || e.body.find('.view--rmediahub-kp').length) return;
            var card=e.data && e.data.movie;
            if(!card) return;
            var btn=$('<div class="full-start__button selector view--rmediahub-kp">'+icon+'<span>RMediaHub</span></div>');
            btn.on('hover:enter',function(){openSource(card);});
            e.body.find('.buttons--container').first().append(btn);
        });
        restore();
    }
    if(window.appready) init();
    else L.Listener.follow('app',function(e){if(e.type==='ready') init();});
}());

}());
