// var opentype = require('./../../../../node_modules/gravit/lib/core/font/opentype/opentype.js');
var GOpenTypeFont = require('./../../../../node_modules/gravit/lib/core/font/opentypefont.js');
var GFont =  require('./../../../../node_modules/gravit/lib/core/font/font.js');
var GOpenTypeUtil =  require('./../../../../node_modules/gravit/lib/core/font/opentypeutil.js');
var fs = require('fs');
var USV_RANGES = {
	"CYRILLIC":43888,
	"GREEK":13056,
	"ADLAM":0x1e900,
	"ARABIC":"عربى",
	"ARMENIAN":0x531,
	"AVESTAN":0x10b00,
	"BALINESE":0x1b05,
	"BAMUM":0xa6a0,
	"BATAK":0x1bc0,
	"BENGALI":0x985,
	"BUHID":0x1740,
	"CHAM":0xaa00,
	"CHEROKEE":0x13a0,
	"HANGUL":0x1100,
	"KATAKANA":0x30a0,
	"COPTIC":0x2c80,
	"DEVANAGARI":0x905,
	"GEORGIAN":0x10a0,
	"HEBREW":"עברית",
	"JAVANESE":0xa985,
	"KANNADA":0xc96,
	"KHMER":0x1780,
	"MALAYALAM":0xd17,
	"MANDAIC":0x840,
	"MONGOLIAN":0x1810,
	"SYRIAC":0x710,
	"TELUGU":0xc12,
	"THAI":0xe01,
	"TIBETAN":0xf00,

	/*undetected*/
	"BRAHMI":69642,
	"BUGINESE":6656,
	"KAITHI":69763,
	"LAO":"ກຂຄງຈ",
	"LEPCHA":7168,
	"LIMBU":6400,
	"LINEAR_B":65536,
	"MYANMAR":4096,
	"OLD_PERSIAN":66464,
	"OSMANYA":66688,
	"PHOENICIAN":67840,
	"RUNIC":5792,
	"SUNDANESE":7044,
	"TAGALOG":5888,
	"TAI_LE":0x1950,
	"TAI_THAM":6688,
	"TAI_VIET":43648,
	"YI":40960
};

// copy-pasted from GOpenTypeFont.js:

//todo:
/*
- detect undetected
- textbuffer getscript in textproperties
- select appropriate font from default font provider
- default font provider with all these fonts generated here
*/
var rangeNames  = Object.keys(USV_RANGES);
var rangeValues = Object.values(USV_RANGES);
var txtLen = 8;
var size = 72;
var minX, minY, maxX, maxY;
var allscripts = [];
var fontList = [];

function handleFile(file) {
	var buffer = fs.readFileSync(file);
	var info = GOpenTypeUtil.getOpenTypeInfo(buffer);

	var family = info.displayname || info.name;
	var weight = info.weight;
	var style = info.style;

	var font = GOpenTypeFont.create(family, style, weight, buffer.buffer);
	var scripts = font.getAvailableScripts(true);

	console.log("handling:" + file + " family:" + family);
	for (var i = 0; i < scripts.length; i++) {
		var script = scripts[i];

		if (!script) {
			continue;
		}

		if (script === "GREEK" || script === "CYRILLIC" && (family !== "Noto Sans")) {
			continue;
		}

		allscripts.push(script);
		var range = USV_RANGES[script];
		if (range) {
			var currFont;
			for (var j = 0; j < fontList.length; j++) {
				if (fontList[j].family === family) {
					currFont = fontList[j];
					break;
				}
			}

			if (!currFont) {
				fontList.push(currFont = {
					family: family,
					fonts: [{
						weight: weight,
						style: style,
						url: 'assets/font/noto/' + file
					}],
					preview: null,
					scripts: scripts.filter(function (s) {return (!!s && s !== "LATIN");})
				});
			} else {
				currFont.fonts.push({
					weight: weight,
					style: style,
					url: 'assets/font/noto/' + file
				});
			}

			if (weight === GFont.Weight.Regular) {
				var text = "";
				if (typeof range === "string") {
					text = range;
				} else {
					for (var j = 0; j < txtLen; j++) {
						text = text.concat(String.fromCodePoint(j+range));
					}
				}
				var glyphs = font.stringToGlyphs(text, 0, 0, size, {script:script,noreverse:true});
				
				var minX = minY = maxX = maxY = null;
				var svgPath = '<path fill="currentColor" d="';
				for (var j = 0; j < glyphs.length-1; j++) {
					svgPath += toSvg(size, glyphs[j].x, glyphs[j].y, glyphs[j].glyph, font);
				}
				svgPath += '"/>';
				var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ' + (-(maxY-minY).toFixed(2)) + " " + (maxX-minX).toFixed(2) + ' ' + (maxY-minY).toFixed(2) + '" height="100%">' + svgPath + '</svg>';
				var svgName = file.replace(/\.[^/.]+$/, '') + '.svg';
				currFont.preview = 'assets/font/noto/' + svgName;
				fs.writeFileSync(svgName, svg);
			}

			
			// console.log(svg);
		}
	}
	// console.log("======================");
	// console.log(family);
	// console.log(font.getAvailableScripts());
	// var 
	
}



function toSvg(size, x, y, glyph, fnt) {
	function _writePos(x, y) {
        if (x < minX || minX === null) minX = x;
        if (x > maxX || maxX === null) maxX = x;
        if (y < minY || minY === null) minY = y;
        if (y > maxY || maxY === null) maxY = y;

        return x.toFixed(2) + ' ' + y.toFixed(2);
    }

    var path = glyph.getPath(x, y, size, {hinting:true}, fnt._openTypeFont);
    var svgPath = "";

    for (var i = 0; i < path.commands.length; i += 1) {
        var cmd = path.commands[i];
        if (cmd.type === 'M') {
            svgPath += 'M' + _writePos(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            svgPath += 'L' + _writePos(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            svgPath += 'C' + _writePos(cmd.x1, cmd.y1) + ' ' + _writePos(cmd.x2, cmd.y2) + ' ' + _writePos(cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            svgPath += 'Q' + _writePos(cmd.x1, cmd.y1) + ' ' + _writePos(cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            svgPath += 'Z';
        }
    }
    return svgPath;
};

fs.readdir(".", function(err, files) {
    if (err) {
        throw err;
    }
    var max = files.length
    for (var i = 0; i < max; i++) {
        if (files[i].endsWith("tf")) {
        	handleFile(files[i]);
        }
    }
    fs.writeFileSync("allscripts.txt", JSON.stringify(allscripts));
    fs.writeFileSync("fontlist.json", JSON.stringify(fontList));
}.bind(this));