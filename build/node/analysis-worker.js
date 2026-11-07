var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.0/ed5.js
var require_ed5 = __commonJS({
  "node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.0/ed5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "	\n\r -\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.1/ed2.js
var require_ed2 = __commonJS({
  "node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xml/1.1/ed2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}";
    exports.RESTRICTED_CHAR = "-\b\v\f-\x7F-\x84\x86-\x9F";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isRestrictedChar(c) {
      return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
    }
    exports.isRestrictedChar = isRestrictedChar;
    function isCharAndNotRestricted(c) {
      return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isCharAndNotRestricted = isCharAndNotRestricted;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xmlns/1.0/ed3.js
var require_ed3 = __commonJS({
  "node_modules/.pnpm/xmlchars@2.2.0/node_modules/xmlchars/xmlns/1.0/ed3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NC_NAME_START_CHAR = "A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}";
    exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9\xB7\u0300-\u036F\u203F-\u2040";
    exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
    exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
    exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
    function isNCNameStartChar(c) {
      return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNCNameStartChar = isNCNameStartChar;
    function isNCNameChar(c) {
      return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
    }
    exports.isNCNameChar = isNCNameChar;
  }
});

// node_modules/.pnpm/saxes@6.0.0/node_modules/saxes/saxes.js
var require_saxes = __commonJS({
  "node_modules/.pnpm/saxes@6.0.0/node_modules/saxes/saxes.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SaxesParser = exports.EVENTS = void 0;
    var ed5 = require_ed5();
    var ed2 = require_ed2();
    var NSed3 = require_ed3();
    var isS = ed5.isS;
    var isChar10 = ed5.isChar;
    var isNameStartChar = ed5.isNameStartChar;
    var isNameChar = ed5.isNameChar;
    var S_LIST = ed5.S_LIST;
    var NAME_RE = ed5.NAME_RE;
    var isChar11 = ed2.isChar;
    var isNCNameStartChar = NSed3.isNCNameStartChar;
    var isNCNameChar = NSed3.isNCNameChar;
    var NC_NAME_RE = NSed3.NC_NAME_RE;
    var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
    var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
    var rootNS = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      xml: XML_NAMESPACE,
      xmlns: XMLNS_NAMESPACE
    };
    var XML_ENTITIES = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    };
    var EOC = -1;
    var NL_LIKE = -2;
    var S_BEGIN = 0;
    var S_BEGIN_WHITESPACE = 1;
    var S_DOCTYPE = 2;
    var S_DOCTYPE_QUOTE = 3;
    var S_DTD = 4;
    var S_DTD_QUOTED = 5;
    var S_DTD_OPEN_WAKA = 6;
    var S_DTD_OPEN_WAKA_BANG = 7;
    var S_DTD_COMMENT = 8;
    var S_DTD_COMMENT_ENDING = 9;
    var S_DTD_COMMENT_ENDED = 10;
    var S_DTD_PI = 11;
    var S_DTD_PI_ENDING = 12;
    var S_TEXT = 13;
    var S_ENTITY = 14;
    var S_OPEN_WAKA = 15;
    var S_OPEN_WAKA_BANG = 16;
    var S_COMMENT = 17;
    var S_COMMENT_ENDING = 18;
    var S_COMMENT_ENDED = 19;
    var S_CDATA = 20;
    var S_CDATA_ENDING = 21;
    var S_CDATA_ENDING_2 = 22;
    var S_PI_FIRST_CHAR = 23;
    var S_PI_REST = 24;
    var S_PI_BODY = 25;
    var S_PI_ENDING = 26;
    var S_XML_DECL_NAME_START = 27;
    var S_XML_DECL_NAME = 28;
    var S_XML_DECL_EQ = 29;
    var S_XML_DECL_VALUE_START = 30;
    var S_XML_DECL_VALUE = 31;
    var S_XML_DECL_SEPARATOR = 32;
    var S_XML_DECL_ENDING = 33;
    var S_OPEN_TAG = 34;
    var S_OPEN_TAG_SLASH = 35;
    var S_ATTRIB = 36;
    var S_ATTRIB_NAME = 37;
    var S_ATTRIB_NAME_SAW_WHITE = 38;
    var S_ATTRIB_VALUE = 39;
    var S_ATTRIB_VALUE_QUOTED = 40;
    var S_ATTRIB_VALUE_CLOSED = 41;
    var S_ATTRIB_VALUE_UNQUOTED = 42;
    var S_CLOSE_TAG = 43;
    var S_CLOSE_TAG_SAW_WHITE = 44;
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    var BANG = 33;
    var DQUOTE = 34;
    var AMP = 38;
    var SQUOTE = 39;
    var MINUS = 45;
    var FORWARD_SLASH = 47;
    var SEMICOLON = 59;
    var LESS = 60;
    var EQUAL = 61;
    var GREATER = 62;
    var QUESTION = 63;
    var OPEN_BRACKET = 91;
    var CLOSE_BRACKET = 93;
    var NEL = 133;
    var LS = 8232;
    var isQuote = (c) => c === DQUOTE || c === SQUOTE;
    var QUOTES = [DQUOTE, SQUOTE];
    var DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
    var DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
    var XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
    var ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
    function nsPairCheck(parser, prefix, uri) {
      switch (prefix) {
        case "xml":
          if (uri !== XML_NAMESPACE) {
            parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
          }
          break;
        case "xmlns":
          if (uri !== XMLNS_NAMESPACE) {
            parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
          }
          break;
        default:
      }
      switch (uri) {
        case XMLNS_NAMESPACE:
          parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
          break;
        case XML_NAMESPACE:
          switch (prefix) {
            case "xml":
              break;
            case "":
              parser.fail(`the default namespace may not be set to ${uri}.`);
              break;
            default:
              parser.fail("may not assign the xml namespace to another prefix.");
          }
          break;
        default:
      }
    }
    function nsMappingCheck(parser, mapping) {
      for (const local of Object.keys(mapping)) {
        nsPairCheck(parser, local, mapping[local]);
      }
    }
    var isNCName = (name) => NC_NAME_RE.test(name);
    var isName = (name) => NAME_RE.test(name);
    var FORBIDDEN_START = 0;
    var FORBIDDEN_BRACKET = 1;
    var FORBIDDEN_BRACKET_BRACKET = 2;
    exports.EVENTS = [
      "xmldecl",
      "text",
      "processinginstruction",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "cdata",
      "error",
      "end",
      "ready"
    ];
    var EVENT_NAME_TO_HANDLER_NAME = {
      xmldecl: "xmldeclHandler",
      text: "textHandler",
      processinginstruction: "piHandler",
      doctype: "doctypeHandler",
      comment: "commentHandler",
      opentagstart: "openTagStartHandler",
      attribute: "attributeHandler",
      opentag: "openTagHandler",
      closetag: "closeTagHandler",
      cdata: "cdataHandler",
      error: "errorHandler",
      end: "endHandler",
      ready: "readyHandler"
    };
    var SaxesParser2 = class {
      /**
       * @param opt The parser options.
       */
      constructor(opt) {
        this.opt = opt !== null && opt !== void 0 ? opt : {};
        this.fragmentOpt = !!this.opt.fragment;
        const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
        this.trackPosition = this.opt.position !== false;
        this.fileName = this.opt.fileName;
        if (xmlnsOpt) {
          this.nameStartCheck = isNCNameStartChar;
          this.nameCheck = isNCNameChar;
          this.isName = isNCName;
          this.processAttribs = this.processAttribsNS;
          this.pushAttrib = this.pushAttribNS;
          this.ns = Object.assign({ __proto__: null }, rootNS);
          const additional = this.opt.additionalNamespaces;
          if (additional != null) {
            nsMappingCheck(this, additional);
            Object.assign(this.ns, additional);
          }
        } else {
          this.nameStartCheck = isNameStartChar;
          this.nameCheck = isNameChar;
          this.isName = isName;
          this.processAttribs = this.processAttribsPlain;
          this.pushAttrib = this.pushAttribPlain;
        }
        this.stateTable = [
          /* eslint-disable @typescript-eslint/unbound-method */
          this.sBegin,
          this.sBeginWhitespace,
          this.sDoctype,
          this.sDoctypeQuote,
          this.sDTD,
          this.sDTDQuoted,
          this.sDTDOpenWaka,
          this.sDTDOpenWakaBang,
          this.sDTDComment,
          this.sDTDCommentEnding,
          this.sDTDCommentEnded,
          this.sDTDPI,
          this.sDTDPIEnding,
          this.sText,
          this.sEntity,
          this.sOpenWaka,
          this.sOpenWakaBang,
          this.sComment,
          this.sCommentEnding,
          this.sCommentEnded,
          this.sCData,
          this.sCDataEnding,
          this.sCDataEnding2,
          this.sPIFirstChar,
          this.sPIRest,
          this.sPIBody,
          this.sPIEnding,
          this.sXMLDeclNameStart,
          this.sXMLDeclName,
          this.sXMLDeclEq,
          this.sXMLDeclValueStart,
          this.sXMLDeclValue,
          this.sXMLDeclSeparator,
          this.sXMLDeclEnding,
          this.sOpenTag,
          this.sOpenTagSlash,
          this.sAttrib,
          this.sAttribName,
          this.sAttribNameSawWhite,
          this.sAttribValue,
          this.sAttribValueQuoted,
          this.sAttribValueClosed,
          this.sAttribValueUnquoted,
          this.sCloseTag,
          this.sCloseTagSawWhite
          /* eslint-enable @typescript-eslint/unbound-method */
        ];
        this._init();
      }
      /**
       * Indicates whether or not the parser is closed. If ``true``, wait for
       * the ``ready`` event to write again.
       */
      get closed() {
        return this._closed;
      }
      _init() {
        var _a2;
        this.openWakaBang = "";
        this.text = "";
        this.name = "";
        this.piTarget = "";
        this.entity = "";
        this.q = null;
        this.tags = [];
        this.tag = null;
        this.topNS = null;
        this.chunk = "";
        this.chunkPosition = 0;
        this.i = 0;
        this.prevI = 0;
        this.carriedFromPrevious = void 0;
        this.forbiddenState = FORBIDDEN_START;
        this.attribList = [];
        const { fragmentOpt } = this;
        this.state = fragmentOpt ? S_TEXT : S_BEGIN;
        this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
        this.xmlDeclPossible = !fragmentOpt;
        this.xmlDeclExpects = ["version"];
        this.entityReturnState = void 0;
        let { defaultXMLVersion } = this.opt;
        if (defaultXMLVersion === void 0) {
          if (this.opt.forceXMLVersion === true) {
            throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
          }
          defaultXMLVersion = "1.0";
        }
        this.setXMLVersion(defaultXMLVersion);
        this.positionAtNewLine = 0;
        this.doctype = false;
        this._closed = false;
        this.xmlDecl = {
          version: void 0,
          encoding: void 0,
          standalone: void 0
        };
        this.line = 1;
        this.column = 0;
        this.ENTITIES = Object.create(XML_ENTITIES);
        (_a2 = this.readyHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this);
      }
      /**
       * The stream position the parser is currently looking at. This field is
       * zero-based.
       *
       * This field is not based on counting Unicode characters but is to be
       * interpreted as a plain index into a JavaScript string.
       */
      get position() {
        return this.chunkPosition + this.i;
      }
      /**
       * The column number of the next character to be read by the parser.  *
       * This field is zero-based. (The first column in a line is 0.)
       *
       * This field reports the index at which the next character would be in the
       * line if the line were represented as a JavaScript string.  Note that this
       * *can* be different to a count based on the number of *Unicode characters*
       * due to how JavaScript handles astral plane characters.
       *
       * See [[column]] for a number that corresponds to a count of Unicode
       * characters.
       */
      get columnIndex() {
        return this.position - this.positionAtNewLine;
      }
      /**
       * Set an event listener on an event. The parser supports one handler per
       * event type. If you try to set an event handler over an existing handler,
       * the old handler is silently overwritten.
       *
       * @param name The event to listen to.
       *
       * @param handler The handler to set.
       */
      on(name, handler) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
      }
      /**
       * Unset an event handler.
       *
       * @parma name The event to stop listening to.
       */
      off(name) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
      }
      /**
       * Make an error object. The error object will have a message that contains
       * the ``fileName`` option passed at the creation of the parser. If position
       * tracking was turned on, it will also have line and column number
       * information.
       *
       * @param message The message describing the error to report.
       *
       * @returns An error object with a properly formatted message.
       */
      makeError(message) {
        var _a2;
        let msg = (_a2 = this.fileName) !== null && _a2 !== void 0 ? _a2 : "";
        if (this.trackPosition) {
          if (msg.length > 0) {
            msg += ":";
          }
          msg += `${this.line}:${this.column}`;
        }
        if (msg.length > 0) {
          msg += ": ";
        }
        return new Error(msg + message);
      }
      /**
       * Report a parsing error. This method is made public so that client code may
       * check for issues that are outside the scope of this project and can report
       * errors.
       *
       * @param message The error to report.
       *
       * @returns this
       */
      fail(message) {
        const err2 = this.makeError(message);
        const handler = this.errorHandler;
        if (handler === void 0) {
          throw err2;
        } else {
          handler(err2);
        }
        return this;
      }
      /**
       * Write a XML data to the parser.
       *
       * @param chunk The XML data to write.
       *
       * @returns this
       */
      // We do need object for the type here. Yes, it often causes problems
      // but not in this case.
      write(chunk) {
        if (this.closed) {
          return this.fail("cannot write after close; assign an onready handler.");
        }
        let end = false;
        if (chunk === null) {
          end = true;
          chunk = "";
        } else if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        if (this.carriedFromPrevious !== void 0) {
          chunk = `${this.carriedFromPrevious}${chunk}`;
          this.carriedFromPrevious = void 0;
        }
        let limit = chunk.length;
        const lastCode = chunk.charCodeAt(limit - 1);
        if (!end && // A trailing CR or surrogate must be carried over to the next
        // chunk.
        (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
          this.carriedFromPrevious = chunk[limit - 1];
          limit--;
          chunk = chunk.slice(0, limit);
        }
        const { stateTable } = this;
        this.chunk = chunk;
        this.i = 0;
        while (this.i < limit) {
          stateTable[this.state].call(this);
        }
        this.chunkPosition += limit;
        return end ? this.end() : this;
      }
      /**
       * Close the current stream. Perform final well-formedness checks and reset
       * the parser tstate.
       *
       * @returns this
       */
      close() {
        return this.write(null);
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.0.
       *
       * @returns The character read.
       */
      getCode10() {
        const { chunk, i: i2 } = this;
        this.prevI = i2;
        this.i = i2 + 1;
        if (i2 >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i2);
        this.column++;
        if (code < 55296) {
          if (code >= SPACE || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR:
              if (chunk.charCodeAt(i2 + 1) === NL) {
                this.i = i2 + 2;
              }
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i2 + 1) - 56320);
        this.i = i2 + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.1.
       *
       * @returns {number} The character read.
       */
      getCode11() {
        const { chunk, i: i2 } = this;
        this.prevI = i2;
        this.i = i2 + 1;
        if (i2 >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i2);
        this.column++;
        if (code < 55296) {
          if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR: {
              const next = chunk.charCodeAt(i2 + 1);
              if (next === NL || next === NEL) {
                this.i = i2 + 2;
              }
            }
            /* yes, fall through */
            case NEL:
            // 0x85
            case LS:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i2 + 1) - 56320);
        this.i = i2 + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Like ``getCode`` but with the return value normalized so that ``NL`` is
       * returned for ``NL_LIKE``.
       */
      getCodeNorm() {
        const c = this.getCode();
        return c === NL_LIKE ? NL : c;
      }
      unget() {
        this.i = this.prevI;
        this.column--;
      }
      /**
       * Capture characters into a buffer until encountering one of a set of
       * characters.
       *
       * @param chars An array of codepoints. Encountering a character in the array
       * ends the capture. (``chars`` may safely contain ``NL``.)
       *
       * @return The character code that made the capture end, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureTo(chars) {
        let { i: start2 } = this;
        const { chunk } = this;
        while (true) {
          const c = this.getCode();
          const isNLLike = c === NL_LIKE;
          const final = isNLLike ? NL : c;
          if (final === EOC || chars.includes(final)) {
            this.text += chunk.slice(start2, this.prevI);
            return final;
          }
          if (isNLLike) {
            this.text += `${chunk.slice(start2, this.prevI)}
`;
            start2 = this.i;
          }
        }
      }
      /**
       * Capture characters into a buffer until encountering a character.
       *
       * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
       * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
       *
       * @return ``true`` if we ran into the character. Otherwise, we ran into the
       * end of the current chunk.
       */
      captureToChar(char) {
        let { i: start2 } = this;
        const { chunk } = this;
        while (true) {
          let c = this.getCode();
          switch (c) {
            case NL_LIKE:
              this.text += `${chunk.slice(start2, this.prevI)}
`;
              start2 = this.i;
              c = NL;
              break;
            case EOC:
              this.text += chunk.slice(start2);
              return false;
            default:
          }
          if (c === char) {
            this.text += chunk.slice(start2, this.prevI);
            return true;
          }
        }
      }
      /**
       * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
       * this parser.
       *
       * @return The character code that made the test fail, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureNameChars() {
        const { chunk, i: start2 } = this;
        while (true) {
          const c = this.getCode();
          if (c === EOC) {
            this.name += chunk.slice(start2);
            return EOC;
          }
          if (!isNameChar(c)) {
            this.name += chunk.slice(start2, this.prevI);
            return c === NL_LIKE ? NL : c;
          }
        }
      }
      /**
       * Skip white spaces.
       *
       * @return The character that ended the skip, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      skipSpaces() {
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC || !isS(c)) {
            return c;
          }
        }
      }
      setXMLVersion(version) {
        this.currentXMLVersion = version;
        if (version === "1.0") {
          this.isChar = isChar10;
          this.getCode = this.getCode10;
        } else {
          this.isChar = isChar11;
          this.getCode = this.getCode11;
        }
      }
      // STATE ENGINE METHODS
      // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
      // to be sure never to come back to this state later.
      sBegin() {
        if (this.chunk.charCodeAt(0) === 65279) {
          this.i++;
          this.column++;
        }
        this.state = S_BEGIN_WHITESPACE;
      }
      sBeginWhitespace() {
        const iBefore = this.i;
        const c = this.skipSpaces();
        if (this.prevI !== iBefore) {
          this.xmlDeclPossible = false;
        }
        switch (c) {
          case LESS:
            this.state = S_OPEN_WAKA;
            if (this.text.length !== 0) {
              throw new Error("no-empty text at start");
            }
            break;
          case EOC:
            break;
          default:
            this.unget();
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
      sDoctype() {
        var _a2;
        const c = this.captureTo(DOCTYPE_TERMINATOR);
        switch (c) {
          case GREATER: {
            (_a2 = this.doctypeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            this.doctype = true;
            break;
          }
          case EOC:
            break;
          default:
            this.text += String.fromCodePoint(c);
            if (c === OPEN_BRACKET) {
              this.state = S_DTD;
            } else if (isQuote(c)) {
              this.state = S_DOCTYPE_QUOTE;
              this.q = c;
            }
        }
      }
      sDoctypeQuote() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.q = null;
          this.state = S_DOCTYPE;
        }
      }
      sDTD() {
        const c = this.captureTo(DTD_TERMINATOR);
        if (c === EOC) {
          return;
        }
        this.text += String.fromCodePoint(c);
        if (c === CLOSE_BRACKET) {
          this.state = S_DOCTYPE;
        } else if (c === LESS) {
          this.state = S_DTD_OPEN_WAKA;
        } else if (isQuote(c)) {
          this.state = S_DTD_QUOTED;
          this.q = c;
        }
      }
      sDTDQuoted() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.state = S_DTD;
          this.q = null;
        }
      }
      sDTDOpenWaka() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        switch (c) {
          case BANG:
            this.state = S_DTD_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            break;
          case QUESTION:
            this.state = S_DTD_PI;
            break;
          default:
            this.state = S_DTD;
        }
      }
      sDTDOpenWakaBang() {
        const char = String.fromCodePoint(this.getCodeNorm());
        const owb = this.openWakaBang += char;
        this.text += char;
        if (owb !== "-") {
          this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
          this.openWakaBang = "";
        }
      }
      sDTDComment() {
        if (this.captureToChar(MINUS)) {
          this.text += "-";
          this.state = S_DTD_COMMENT_ENDING;
        }
      }
      sDTDCommentEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
      }
      sDTDCommentEnded() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        } else {
          this.fail("malformed comment.");
          this.state = S_DTD_COMMENT;
        }
      }
      sDTDPI() {
        if (this.captureToChar(QUESTION)) {
          this.text += "?";
          this.state = S_DTD_PI_ENDING;
        }
      }
      sDTDPIEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        }
      }
      sText() {
        if (this.tags.length !== 0) {
          this.handleTextInRoot();
        } else {
          this.handleTextOutsideRoot();
        }
      }
      sEntity() {
        let { i: start2 } = this;
        const { chunk } = this;
        loop:
          while (true) {
            switch (this.getCode()) {
              case NL_LIKE:
                this.entity += `${chunk.slice(start2, this.prevI)}
`;
                start2 = this.i;
                break;
              case SEMICOLON: {
                const { entityReturnState } = this;
                const entity = this.entity + chunk.slice(start2, this.prevI);
                this.state = entityReturnState;
                let parsed;
                if (entity === "") {
                  this.fail("empty entity name.");
                  parsed = "&;";
                } else {
                  parsed = this.parseEntity(entity);
                  this.entity = "";
                }
                if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                  this.text += parsed;
                }
                break loop;
              }
              case EOC:
                this.entity += chunk.slice(start2);
                break loop;
              default:
            }
          }
      }
      sOpenWaka() {
        const c = this.getCode();
        if (isNameStartChar(c)) {
          this.state = S_OPEN_TAG;
          this.unget();
          this.xmlDeclPossible = false;
        } else {
          switch (c) {
            case FORWARD_SLASH:
              this.state = S_CLOSE_TAG;
              this.xmlDeclPossible = false;
              break;
            case BANG:
              this.state = S_OPEN_WAKA_BANG;
              this.openWakaBang = "";
              this.xmlDeclPossible = false;
              break;
            case QUESTION:
              this.state = S_PI_FIRST_CHAR;
              break;
            default:
              this.fail("disallowed character in tag name");
              this.state = S_TEXT;
              this.xmlDeclPossible = false;
          }
        }
      }
      sOpenWakaBang() {
        this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
        switch (this.openWakaBang) {
          case "[CDATA[":
            if (!this.sawRoot && !this.reportedTextBeforeRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextBeforeRoot = true;
            }
            if (this.closedRoot && !this.reportedTextAfterRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextAfterRoot = true;
            }
            this.state = S_CDATA;
            this.openWakaBang = "";
            break;
          case "--":
            this.state = S_COMMENT;
            this.openWakaBang = "";
            break;
          case "DOCTYPE":
            this.state = S_DOCTYPE;
            if (this.doctype || this.sawRoot) {
              this.fail("inappropriately located doctype declaration.");
            }
            this.openWakaBang = "";
            break;
          default:
            if (this.openWakaBang.length >= 7) {
              this.fail("incorrect syntax.");
            }
        }
      }
      sComment() {
        if (this.captureToChar(MINUS)) {
          this.state = S_COMMENT_ENDING;
        }
      }
      sCommentEnding() {
        var _a2;
        const c = this.getCodeNorm();
        if (c === MINUS) {
          this.state = S_COMMENT_ENDED;
          (_a2 = this.commentHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
          this.text = "";
        } else {
          this.text += `-${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        }
      }
      sCommentEnded() {
        const c = this.getCodeNorm();
        if (c !== GREATER) {
          this.fail("malformed comment.");
          this.text += `--${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        } else {
          this.state = S_TEXT;
        }
      }
      sCData() {
        if (this.captureToChar(CLOSE_BRACKET)) {
          this.state = S_CDATA_ENDING;
        }
      }
      sCDataEnding() {
        const c = this.getCodeNorm();
        if (c === CLOSE_BRACKET) {
          this.state = S_CDATA_ENDING_2;
        } else {
          this.text += `]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
        }
      }
      sCDataEnding2() {
        var _a2;
        const c = this.getCodeNorm();
        switch (c) {
          case GREATER: {
            (_a2 = this.cdataHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            break;
          }
          case CLOSE_BRACKET:
            this.text += "]";
            break;
          default:
            this.text += `]]${String.fromCodePoint(c)}`;
            this.state = S_CDATA;
        }
      }
      // We need this separate state to check the first character fo the pi target
      // with this.nameStartCheck which allows less characters than this.nameCheck.
      sPIFirstChar() {
        const c = this.getCodeNorm();
        if (this.nameStartCheck(c)) {
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        } else if (c === QUESTION || isS(c)) {
          this.fail("processing instruction without a target.");
          this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
        } else {
          this.fail("disallowed character in processing instruction name.");
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        }
      }
      sPIRest() {
        const { chunk, i: start2 } = this;
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC) {
            this.piTarget += chunk.slice(start2);
            return;
          }
          if (!this.nameCheck(c)) {
            this.piTarget += chunk.slice(start2, this.prevI);
            const isQuestion = c === QUESTION;
            if (isQuestion || isS(c)) {
              if (this.piTarget === "xml") {
                if (!this.xmlDeclPossible) {
                  this.fail("an XML declaration must be at the start of the document.");
                }
                this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
              } else {
                this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
              }
            } else {
              this.fail("disallowed character in processing instruction name.");
              this.piTarget += String.fromCodePoint(c);
            }
            break;
          }
        }
      }
      sPIBody() {
        if (this.text.length === 0) {
          const c = this.getCodeNorm();
          if (c === QUESTION) {
            this.state = S_PI_ENDING;
          } else if (!isS(c)) {
            this.text = String.fromCodePoint(c);
          }
        } else if (this.captureToChar(QUESTION)) {
          this.state = S_PI_ENDING;
        }
      }
      sPIEnding() {
        var _a2;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          const { piTarget } = this;
          if (piTarget.toLowerCase() === "xml") {
            this.fail("the XML declaration must appear at the start of the document.");
          }
          (_a2 = this.piHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, {
            target: piTarget,
            body: this.text
          });
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else if (c === QUESTION) {
          this.text += "?";
        } else {
          this.text += `?${String.fromCodePoint(c)}`;
          this.state = S_PI_BODY;
        }
        this.xmlDeclPossible = false;
      }
      sXMLDeclNameStart() {
        const c = this.skipSpaces();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (c !== EOC) {
          this.state = S_XML_DECL_NAME;
          this.name = String.fromCodePoint(c);
        }
      }
      sXMLDeclName() {
        const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.name += this.text;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (!(isS(c) || c === EQUAL)) {
          return;
        }
        this.name += this.text;
        this.text = "";
        if (!this.xmlDeclExpects.includes(this.name)) {
          switch (this.name.length) {
            case 0:
              this.fail("did not expect any more name/value pairs.");
              break;
            case 1:
              this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
              break;
            default:
              this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
          }
        }
        this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
      }
      sXMLDeclEq() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (c !== EQUAL) {
          this.fail("value required.");
        }
        this.state = S_XML_DECL_VALUE_START;
      }
      sXMLDeclValueStart() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (!isQuote(c)) {
          this.fail("value must be quoted.");
          this.q = SPACE;
        } else {
          this.q = c;
        }
        this.state = S_XML_DECL_VALUE;
      }
      sXMLDeclValue() {
        const c = this.captureTo([this.q, QUESTION]);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (c === EOC) {
          return;
        }
        const value = this.text;
        this.text = "";
        switch (this.name) {
          case "version": {
            this.xmlDeclExpects = ["encoding", "standalone"];
            const version = value;
            this.xmlDecl.version = version;
            if (!/^1\.[0-9]+$/.test(version)) {
              this.fail("version number must match /^1\\.[0-9]+$/.");
            } else if (!this.opt.forceXMLVersion) {
              this.setXMLVersion(version);
            }
            break;
          }
          case "encoding":
            if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
              this.fail("encoding value must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
            }
            this.xmlDeclExpects = ["standalone"];
            this.xmlDecl.encoding = value;
            break;
          case "standalone":
            if (value !== "yes" && value !== "no") {
              this.fail('standalone value must match "yes" or "no".');
            }
            this.xmlDeclExpects = [];
            this.xmlDecl.standalone = value;
            break;
          default:
        }
        this.name = "";
        this.state = S_XML_DECL_SEPARATOR;
      }
      sXMLDeclSeparator() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (!isS(c)) {
          this.fail("whitespace required.");
          this.unget();
        }
        this.state = S_XML_DECL_NAME_START;
      }
      sXMLDeclEnding() {
        var _a2;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          if (this.piTarget !== "xml") {
            this.fail("processing instructions are not allowed before root.");
          } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
            this.fail("XML declaration must contain a version.");
          }
          (_a2 = this.xmldeclHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, this.xmlDecl);
          this.name = "";
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else {
          this.fail("The character ? is disallowed anywhere in XML declarations.");
        }
        this.xmlDeclPossible = false;
      }
      sOpenTag() {
        var _a2;
        const c = this.captureNameChars();
        if (c === EOC) {
          return;
        }
        const tag = this.tag = {
          name: this.name,
          attributes: /* @__PURE__ */ Object.create(null)
        };
        this.name = "";
        if (this.xmlnsOpt) {
          this.topNS = tag.ns = /* @__PURE__ */ Object.create(null);
        }
        (_a2 = this.openTagStartHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
        this.sawRoot = true;
        if (!this.fragmentOpt && this.closedRoot) {
          this.fail("documents may contain only one root.");
        }
        switch (c) {
          case GREATER:
            this.openTag();
            break;
          case FORWARD_SLASH:
            this.state = S_OPEN_TAG_SLASH;
            break;
          default:
            if (!isS(c)) {
              this.fail("disallowed character in tag name.");
            }
            this.state = S_ATTRIB;
        }
      }
      sOpenTagSlash() {
        if (this.getCode() === GREATER) {
          this.openSelfClosingTag();
        } else {
          this.fail("forward-slash in opening tag not followed by >.");
          this.state = S_ATTRIB;
        }
      }
      sAttrib() {
        const c = this.skipSpaces();
        if (c === EOC) {
          return;
        }
        if (isNameStartChar(c)) {
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribName() {
        const c = this.captureNameChars();
        if (c === EQUAL) {
          this.state = S_ATTRIB_VALUE;
        } else if (isS(c)) {
          this.state = S_ATTRIB_NAME_SAW_WHITE;
        } else if (c === GREATER) {
          this.fail("attribute without value.");
          this.pushAttrib(this.name, this.name);
          this.name = this.text = "";
          this.openTag();
        } else if (c !== EOC) {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribNameSawWhite() {
        const c = this.skipSpaces();
        switch (c) {
          case EOC:
            return;
          case EQUAL:
            this.state = S_ATTRIB_VALUE;
            break;
          default:
            this.fail("attribute without value.");
            this.text = "";
            this.name = "";
            if (c === GREATER) {
              this.openTag();
            } else if (isNameStartChar(c)) {
              this.unget();
              this.state = S_ATTRIB_NAME;
            } else {
              this.fail("disallowed character in attribute name.");
              this.state = S_ATTRIB;
            }
        }
      }
      sAttribValue() {
        const c = this.getCodeNorm();
        if (isQuote(c)) {
          this.q = c;
          this.state = S_ATTRIB_VALUE_QUOTED;
        } else if (!isS(c)) {
          this.fail("unquoted attribute value.");
          this.state = S_ATTRIB_VALUE_UNQUOTED;
          this.unget();
        }
      }
      sAttribValueQuoted() {
        const { q, chunk } = this;
        let { i: start2 } = this;
        while (true) {
          switch (this.getCode()) {
            case q:
              this.pushAttrib(this.name, this.text + chunk.slice(start2, this.prevI));
              this.name = this.text = "";
              this.q = null;
              this.state = S_ATTRIB_VALUE_CLOSED;
              return;
            case AMP:
              this.text += chunk.slice(start2, this.prevI);
              this.state = S_ENTITY;
              this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
              return;
            case NL:
            case NL_LIKE:
            case TAB:
              this.text += `${chunk.slice(start2, this.prevI)} `;
              start2 = this.i;
              break;
            case LESS:
              this.text += chunk.slice(start2, this.prevI);
              this.fail("disallowed character.");
              return;
            case EOC:
              this.text += chunk.slice(start2);
              return;
            default:
          }
        }
      }
      sAttribValueClosed() {
        const c = this.getCodeNorm();
        if (isS(c)) {
          this.state = S_ATTRIB;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else if (isNameStartChar(c)) {
          this.fail("no whitespace between attributes.");
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribValueUnquoted() {
        const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
        switch (c) {
          case AMP:
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
            break;
          case LESS:
            this.fail("disallowed character.");
            break;
          case EOC:
            break;
          default:
            if (this.text.includes("]]>")) {
              this.fail('the string "]]>" is disallowed in char data.');
            }
            this.pushAttrib(this.name, this.text);
            this.name = this.text = "";
            if (c === GREATER) {
              this.openTag();
            } else {
              this.state = S_ATTRIB;
            }
        }
      }
      sCloseTag() {
        const c = this.captureNameChars();
        if (c === GREATER) {
          this.closeTag();
        } else if (isS(c)) {
          this.state = S_CLOSE_TAG_SAW_WHITE;
        } else if (c !== EOC) {
          this.fail("disallowed character in closing tag.");
        }
      }
      sCloseTagSawWhite() {
        switch (this.skipSpaces()) {
          case GREATER:
            this.closeTag();
            break;
          case EOC:
            break;
          default:
            this.fail("disallowed character in closing tag.");
        }
      }
      // END OF STATE ENGINE METHODS
      handleTextInRoot() {
        let { i: start2, forbiddenState } = this;
        const { chunk, textHandler: handler } = this;
        scanLoop:
          while (true) {
            switch (this.getCode()) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start2, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start2, this.prevI);
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              case CLOSE_BRACKET:
                switch (forbiddenState) {
                  case FORBIDDEN_START:
                    forbiddenState = FORBIDDEN_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET:
                    forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET_BRACKET:
                    break;
                  default:
                    throw new Error("impossible state");
                }
                break;
              case GREATER:
                if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                  this.fail('the string "]]>" is disallowed in char data.');
                }
                forbiddenState = FORBIDDEN_START;
                break;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start2, this.prevI)}
`;
                }
                start2 = this.i;
                forbiddenState = FORBIDDEN_START;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start2);
                }
                break scanLoop;
              default:
                forbiddenState = FORBIDDEN_START;
            }
          }
        this.forbiddenState = forbiddenState;
      }
      handleTextOutsideRoot() {
        let { i: start2 } = this;
        const { chunk, textHandler: handler } = this;
        let nonSpace = false;
        outRootLoop:
          while (true) {
            const code = this.getCode();
            switch (code) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start2, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                break outRootLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start2, this.prevI);
                }
                nonSpace = true;
                break outRootLoop;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start2, this.prevI)}
`;
                }
                start2 = this.i;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start2);
                }
                break outRootLoop;
              default:
                if (!isS(code)) {
                  nonSpace = true;
                }
            }
          }
        if (!nonSpace) {
          return;
        }
        if (!this.sawRoot && !this.reportedTextBeforeRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextBeforeRoot = true;
        }
        if (this.closedRoot && !this.reportedTextAfterRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextAfterRoot = true;
        }
      }
      pushAttribNS(name, value) {
        var _a2;
        const { prefix, local } = this.qname(name);
        const attr = { name, prefix, local, value };
        this.attribList.push(attr);
        (_a2 = this.attributeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, attr);
        if (prefix === "xmlns") {
          const trimmed = value.trim();
          if (this.currentXMLVersion === "1.0" && trimmed === "") {
            this.fail("invalid attempt to undefine prefix in XML 1.0");
          }
          this.topNS[local] = trimmed;
          nsPairCheck(this, local, trimmed);
        } else if (name === "xmlns") {
          const trimmed = value.trim();
          this.topNS[""] = trimmed;
          nsPairCheck(this, "", trimmed);
        }
      }
      pushAttribPlain(name, value) {
        var _a2;
        const attr = { name, value };
        this.attribList.push(attr);
        (_a2 = this.attributeHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, attr);
      }
      /**
       * End parsing. This performs final well-formedness checks and resets the
       * parser to a clean state.
       *
       * @returns this
       */
      end() {
        var _a2, _b2;
        if (!this.sawRoot) {
          this.fail("document must contain a root element.");
        }
        const { tags } = this;
        while (tags.length > 0) {
          const tag = tags.pop();
          this.fail(`unclosed tag: ${tag.name}`);
        }
        if (this.state !== S_BEGIN && this.state !== S_TEXT) {
          this.fail("unexpected end.");
        }
        const { text } = this;
        if (text.length !== 0) {
          (_a2 = this.textHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, text);
          this.text = "";
        }
        this._closed = true;
        (_b2 = this.endHandler) === null || _b2 === void 0 ? void 0 : _b2.call(this);
        this._init();
        return this;
      }
      /**
       * Resolve a namespace prefix.
       *
       * @param prefix The prefix to resolve.
       *
       * @returns The namespace URI or ``undefined`` if the prefix is not defined.
       */
      resolve(prefix) {
        var _a2, _b2;
        let uri = this.topNS[prefix];
        if (uri !== void 0) {
          return uri;
        }
        const { tags } = this;
        for (let index = tags.length - 1; index >= 0; index--) {
          uri = tags[index].ns[prefix];
          if (uri !== void 0) {
            return uri;
          }
        }
        uri = this.ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
        return (_b2 = (_a2 = this.opt).resolvePrefix) === null || _b2 === void 0 ? void 0 : _b2.call(_a2, prefix);
      }
      /**
       * Parse a qname into its prefix and local name parts.
       *
       * @param name The name to parse
       *
       * @returns
       */
      qname(name) {
        const colon = name.indexOf(":");
        if (colon === -1) {
          return { prefix: "", local: name };
        }
        const local = name.slice(colon + 1);
        const prefix = name.slice(0, colon);
        if (prefix === "" || local === "" || local.includes(":")) {
          this.fail(`malformed name: ${name}.`);
        }
        return { prefix, local };
      }
      processAttribsNS() {
        var _a2;
        const { attribList } = this;
        const tag = this.tag;
        {
          const { prefix, local } = this.qname(tag.name);
          tag.prefix = prefix;
          tag.local = local;
          const uri = tag.uri = (_a2 = this.resolve(prefix)) !== null && _a2 !== void 0 ? _a2 : "";
          if (prefix !== "") {
            if (prefix === "xmlns") {
              this.fail('tags may not have "xmlns" as prefix.');
            }
            if (uri === "") {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              tag.uri = prefix;
            }
          }
        }
        if (attribList.length === 0) {
          return;
        }
        const { attributes } = tag;
        const seen = /* @__PURE__ */ new Set();
        for (const attr of attribList) {
          const { name, prefix, local } = attr;
          let uri;
          let eqname;
          if (prefix === "") {
            uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
            eqname = name;
          } else {
            uri = this.resolve(prefix);
            if (uri === void 0) {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              uri = prefix;
            }
            eqname = `{${uri}}${local}`;
          }
          if (seen.has(eqname)) {
            this.fail(`duplicate attribute: ${eqname}.`);
          }
          seen.add(eqname);
          attr.uri = uri;
          attributes[name] = attr;
        }
        this.attribList = [];
      }
      processAttribsPlain() {
        const { attribList } = this;
        const attributes = this.tag.attributes;
        for (const { name, value } of attribList) {
          if (attributes[name] !== void 0) {
            this.fail(`duplicate attribute: ${name}.`);
          }
          attributes[name] = value;
        }
        this.attribList = [];
      }
      /**
       * Handle a complete open tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onopentag``.
       */
      openTag() {
        var _a2;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = false;
        (_a2 = this.openTagHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
        tags.push(tag);
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete self-closing tag. This parser code calls this once it has
       * seen the whole tag. This method checks for well-formeness and then emits
       * ``onopentag`` and ``onclosetag``.
       */
      openSelfClosingTag() {
        var _a2, _b2, _c;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = true;
        (_a2 = this.openTagHandler) === null || _a2 === void 0 ? void 0 : _a2.call(this, tag);
        (_b2 = this.closeTagHandler) === null || _b2 === void 0 ? void 0 : _b2.call(this, tag);
        const top = this.tag = (_c = tags[tags.length - 1]) !== null && _c !== void 0 ? _c : null;
        if (top === null) {
          this.closedRoot = true;
        }
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete close tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onclosetag``.
       */
      closeTag() {
        const { tags, name } = this;
        this.state = S_TEXT;
        this.name = "";
        if (name === "") {
          this.fail("weird empty close tag.");
          this.text += "</>";
          return;
        }
        const handler = this.closeTagHandler;
        let l = tags.length;
        while (l-- > 0) {
          const tag = this.tag = tags.pop();
          this.topNS = tag.ns;
          handler === null || handler === void 0 ? void 0 : handler(tag);
          if (tag.name === name) {
            break;
          }
          this.fail("unexpected close tag.");
        }
        if (l === 0) {
          this.closedRoot = true;
        } else if (l < 0) {
          this.fail(`unmatched closing tag: ${name}.`);
          this.text += `</${name}>`;
        }
      }
      /**
       * Resolves an entity. Makes any necessary well-formedness checks.
       *
       * @param entity The entity to resolve.
       *
       * @returns The parsed entity.
       */
      parseEntity(entity) {
        if (entity[0] !== "#") {
          const defined = this.ENTITIES[entity];
          if (defined !== void 0) {
            return defined;
          }
          this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
          return `&${entity};`;
        }
        let num = NaN;
        if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
          num = parseInt(entity.slice(2), 16);
        } else if (/^#[0-9]+$/.test(entity)) {
          num = parseInt(entity.slice(1), 10);
        }
        if (!this.isChar(num)) {
          this.fail("malformed character entity.");
          return `&${entity};`;
        }
        return String.fromCodePoint(num);
      }
    };
    exports.SaxesParser = SaxesParser2;
  }
});

// src/node/analysis-worker.js
import { parentPort, workerData as task } from "node:worker_threads";
import { open, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";

// src/math.js
var identity = () => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function multiply(a, b) {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function transform(m, p, w = 1) {
  const d = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15] * w;
  return [0, 1, 2].map(
    (r) => (m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * w) / (w && d ? d : 1)
  );
}

// src/memory.js
var MEMORY_OVERHEAD = 64 * 1024 * 1024;
var TRIANGLE_MEMORY = 224;
function geometryMemory(g) {
  if (!g) return 0;
  return g.triangles * TRIANGLE_MEMORY + (g.smoothNormals?.byteLength || 0) * 4 + ((g.edges?.byteLength || 0) + (g.wire?.byteLength || 0)) * 2;
}
function assertMemory(limits, bytes, operation = "model") {
  if (bytes > (limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER))
    throw new Error(
      `Estimated memory for this ${operation} exceeds the device safety budget. Use a smaller model or a device with more memory.`
    );
}

// src/geometry.js
var DEFAULT_LIMITS = Object.freeze({
  max_file_bytes: 256 * 1024 * 1024,
  max_triangles: 5e6,
  max_uncompressed_bytes: 256 * 1024 * 1024,
  max_archive_entries: 1024,
  max_memory_bytes: Number.MAX_SAFE_INTEGER
});
function colorRGB(value) {
  if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value))
    throw new Error("Color must be #RRGGBB");
  return [1, 3, 5].map((i2) => parseInt(value.slice(i2, i2 + 2), 16) / 255);
}
function finishGeometry(positions, colors = null, limits = DEFAULT_LIMITS) {
  if (!(positions instanceof Float32Array) || !positions.length || positions.length % 9)
    throw new Error("Geometry must contain complete triangles");
  if (positions.length / 9 > limits.max_triangles)
    throw new Error("Triangle limit exceeded");
  assertMemory(
    limits,
    MEMORY_OVERHEAD + positions.length / 9 * TRIANGLE_MEMORY
  );
  if (colors && (!(colors instanceof Float32Array) || colors.length !== positions.length))
    throw new Error("Invalid vertex colors");
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity]
  };
  for (let i2 = 0; i2 < positions.length; i2++) {
    const v = positions[i2], a = i2 % 3;
    if (!Number.isFinite(v)) throw new Error("Non-finite vertex coordinate");
    bounds.min[a] = Math.min(bounds.min[a], v);
    bounds.max[a] = Math.max(bounds.max[a], v);
    if (colors && (!Number.isFinite(colors[i2]) || colors[i2] < 0 || colors[i2] > 1))
      throw new Error("Invalid vertex color");
  }
  const normals = new Float32Array(positions.length), blocks = new Float32Array(Math.ceil(positions.length / 9 / 64) * 6);
  let area = 0, volume = 0, degenerateTriangles = 0;
  for (let i2 = 0; i2 < positions.length; i2 += 9) {
    const ax = positions[i2 + 3] - positions[i2], ay = positions[i2 + 4] - positions[i2 + 1], az = positions[i2 + 5] - positions[i2 + 2];
    const bx = positions[i2 + 6] - positions[i2], by = positions[i2 + 7] - positions[i2 + 1], bz = positions[i2 + 8] - positions[i2 + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, length = Math.hypot(nx, ny, nz);
    area += length / 2;
    volume += (positions[i2] * nx + positions[i2 + 1] * ny + positions[i2 + 2] * nz) / 6;
    if (!length) degenerateTriangles++;
    for (let k = 0; k < 9; k += 3) {
      normals[i2 + k] = nx / (length || 1);
      normals[i2 + k + 1] = ny / (length || 1);
      normals[i2 + k + 2] = nz / (length || 1);
    }
    const block = Math.floor(i2 / 9 / 64) * 6;
    if (i2 / 9 % 64 === 0) {
      blocks.set(
        [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
        block
      );
    }
    for (let k = 0; k < 9; k++) {
      const a = k % 3;
      blocks[block + a] = Math.min(blocks[block + a], positions[i2 + k]);
      blocks[block + 3 + a] = Math.max(blocks[block + 3 + a], positions[i2 + k]);
    }
  }
  if (!Number.isFinite(area) || !Number.isFinite(volume))
    throw new Error("Geometry magnitude exceeds numeric limits");
  return {
    positions,
    normals,
    colors,
    blocks,
    bounds,
    triangles: positions.length / 9,
    area,
    volume: Math.abs(volume),
    degenerateTriangles
  };
}

// src/parser.js
function binaryWriter(count, header, limits, inputBytes = 0) {
  if (count > limits.max_triangles) throw new Error("Triangle limit exceeded");
  assertMemory(limits, MEMORY_OVERHEAD + inputBytes + count * TRIANGLE_MEMORY);
  const positions = new Float32Array(count * 9);
  let colors = null;
  const text = new TextDecoder().decode(header), ci = text.indexOf("COLOR=");
  const magics = ci >= 0 && ci + 10 <= 80;
  const legacy = /^Binary colored STL by viewstl\.com/i.test(text);
  const fallback = magics ? [...header.subarray(ci + 6, ci + 9)].map((v) => v / 255) : [144 / 255, 144 / 255, 144 / 255];
  return {
    write(d, offset, t) {
      for (let k = 0; k < 9; k++)
        positions[t * 9 + k] = d.getFloat32(offset + 12 + k * 4, true);
      const attr = d.getUint16(offset + 48, true), colored = magics || legacy || !!(attr & 32768);
      if (colored && !colors) {
        colors = new Float32Array(count * 9);
        for (let i2 = 0; i2 < colors.length; i2++) colors[i2] = fallback[i2 % 3];
      }
      if (colored) {
        const c = magics && attr & 32768 ? fallback : (magics || legacy ? [attr & 31, attr >> 5 & 31, attr >> 10 & 31] : [attr >> 10 & 31, attr >> 5 & 31, attr & 31]).map((v) => v / 31);
        for (let k = 0; k < 9; k++) colors[t * 9 + k] = c[k % 3];
      }
    },
    finish() {
      return {
        ...finishGeometry(positions, colors, limits),
        format: "stl-binary"
      };
    }
  };
}
function parseSTL(buffer, limits = DEFAULT_LIMITS) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > limits.max_file_bytes)
    throw new Error("Invalid or oversized STL");
  const d = new DataView(buffer), count = buffer.byteLength >= 84 ? d.getUint32(80, true) : 0;
  const binary = count > 0 && 84 + count * 50 === buffer.byteLength;
  let positions, colors = null;
  if (binary) {
    const writer = binaryWriter(
      count,
      new Uint8Array(buffer, 0, 80),
      limits,
      buffer.byteLength
    );
    for (let t = 0; t < count; t++) writer.write(d, 84 + t * 50, t);
    return writer.finish();
  } else {
    assertMemory(limits, MEMORY_OVERHEAD + buffer.byteLength * 3);
    const text = new TextDecoder().decode(buffer);
    if (!/^\s*solid(?:\s|$)/i.test(text) || !/\bendsolid\b/i.test(text))
      throw new Error("Invalid or truncated STL");
    const pattern = /\bvertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;
    let vertices = 0, match;
    while (pattern.exec(text)) {
      vertices++;
      if (vertices > limits.max_triangles * 3)
        throw new Error("Triangle limit exceeded");
      assertMemory(
        limits,
        MEMORY_OVERHEAD + buffer.byteLength * 3 + vertices / 3 * TRIANGLE_MEMORY
      );
    }
    if (!vertices || vertices % 3 || (text.match(/\bendfacet\b/gi) || []).length !== vertices / 3)
      throw new Error("Incomplete ASCII STL triangles");
    positions = new Float32Array(vertices * 3);
    pattern.lastIndex = 0;
    let i2 = 0;
    while (match = pattern.exec(text))
      for (let k = 1; k <= 3; k++) positions[i2++] = Number(match[k]);
  }
  return {
    ...finishGeometry(positions, colors, limits),
    format: binary ? "stl-binary" : "stl-ascii"
  };
}
function parseOBJ(buffer, limits = DEFAULT_LIMITS) {
  if (buffer.byteLength > limits.max_file_bytes)
    throw new Error("File size limit exceeded");
  assertMemory(limits, MEMORY_OVERHEAD + buffer.byteLength * 3);
  const text = new TextDecoder().decode(buffer), vertices = [], faces = [];
  for (const [line] of text.matchAll(/[^\r\n]+/g)) {
    const parts = line.trim().split(/\s+/);
    if (!parts[0] || parts[0].startsWith("#")) continue;
    if (parts[0] === "v") {
      if (parts.length < 4) throw new Error("Invalid OBJ vertex");
      const p = parts.slice(1, 4).map(Number);
      if (p.some((v) => !Number.isFinite(v)))
        throw new Error("Invalid OBJ coordinate");
      vertices.push(p);
      assertMemory(
        limits,
        MEMORY_OVERHEAD + buffer.byteLength * 3 + vertices.length * 128 + faces.length / 3 * 320
      );
      if (vertices.length > limits.max_triangles * 3)
        throw new Error("Vertex limit exceeded");
    } else if (parts[0] === "f") {
      const comment = parts.findIndex((p) => p.startsWith("#"));
      if (comment >= 0) parts.length = comment;
      if (parts.length < 4) throw new Error("Invalid OBJ face");
      const ids = parts.slice(1).map((p) => {
        const id = Number(p.split("/")[0]);
        const index = id < 0 ? vertices.length + id : id - 1;
        if (!Number.isInteger(id) || id === 0 || index < 0 || index >= vertices.length)
          throw new Error("Invalid OBJ index");
        return index;
      });
      for (let j = 1; j < ids.length - 1; j++) {
        faces.push(ids[0], ids[j], ids[j + 1]);
        assertMemory(
          limits,
          MEMORY_OVERHEAD + buffer.byteLength * 3 + vertices.length * 128 + faces.length / 3 * 320
        );
        if (faces.length / 3 > limits.max_triangles)
          throw new Error("Triangle limit exceeded");
      }
    }
  }
  const positions = new Float32Array(faces.length * 3);
  faces.forEach((id, i2) => positions.set(vertices[id], i2 * 3));
  return { ...finishGeometry(positions, null, limits), format: "obj" };
}
function parseGeometry(buffer, name = "", limits = DEFAULT_LIMITS) {
  return /\.obj(?:[?#]|$)/i.test(name) ? parseOBJ(buffer, limits) : parseSTL(buffer, limits);
}

// node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start2) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start2 += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var Inflate = /* @__PURE__ */ (function() {
  function Inflate2(opts, cb) {
    if (typeof opts == "function")
      cb = opts, opts = {};
    this.ondata = cb;
    var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
    this.s = { i: 0, b: dict ? dict.length : 0 };
    this.o = new u8(32768);
    this.p = new u8(0);
    if (dict)
      this.o.set(dict);
  }
  Inflate2.prototype.e = function(c) {
    if (!this.ondata)
      err(5);
    if (this.d)
      err(4);
    if (!this.p.length)
      this.p = c;
    else if (c.length) {
      var n = new u8(this.p.length + c.length);
      n.set(this.p), n.set(c, this.p.length), this.p = n;
    }
  };
  Inflate2.prototype.c = function(final) {
    this.s.i = +(this.d = final || false);
    var bts = this.s.b;
    var dt = inflt(this.p, this.s, this.o);
    this.ondata(slc(dt, bts, this.s.b), this.d);
    this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
    this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
  };
  Inflate2.prototype.push = function(chunk, final) {
    this.e(chunk), this.c(final);
  };
  return Inflate2;
})();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}

// src/archive.js
var import_saxes = __toESM(require_saxes(), 1);
var decoder = new TextDecoder("utf-8", { fatal: true });
var crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
  return n >>> 0;
});
function crc(data, state = 4294967295) {
  for (const b of data) state = crcTable[(state ^ b) & 255] ^ state >>> 8;
  return state >>> 0;
}
function safePath(name) {
  if (!name || name.includes("\\") || name.startsWith("/") || name.includes("\0") || name.split("/").some((p) => p === ".." || p === ".") || /^[a-z]+:/i.test(name))
    throw new Error("Unsafe archive path");
  return name;
}
function unzipChecked(buffer, limits = DEFAULT_LIMITS) {
  if (buffer.byteLength > limits.max_file_bytes)
    throw new Error("Archive size limit exceeded");
  const bytes = new Uint8Array(buffer), d = new DataView(buffer);
  let end = -1;
  for (let i2 = bytes.length - 22; i2 >= Math.max(0, bytes.length - 65557); i2--)
    if (d.getUint32(i2, true) === 101010256 && i2 + 22 + d.getUint16(i2 + 20, true) === bytes.length) {
      end = i2;
      break;
    }
  if (end < 0) throw new Error("ZIP central directory not found");
  const count = d.getUint16(end + 10, true), size = d.getUint32(end + 12, true), start2 = d.getUint32(end + 16, true);
  if (d.getUint16(end + 4, true) || d.getUint16(end + 6, true) || count !== d.getUint16(end + 8, true))
    throw new Error("Multi-disk ZIP is unsupported");
  if (count === 65535 || start2 === 4294967295 || size === 4294967295)
    throw new Error("ZIP64 is unsupported");
  if (count > limits.max_archive_entries || start2 + size > end)
    throw new Error("Invalid or oversized ZIP directory");
  const entries = [], seen = /* @__PURE__ */ new Set();
  let offset = start2, total = 0;
  for (let i2 = 0; i2 < count; i2++) {
    if (offset + 46 > start2 + size || d.getUint32(offset, true) !== 33639248)
      throw new Error("Invalid ZIP directory entry");
    const flags = d.getUint16(offset + 8, true), method = d.getUint16(offset + 10, true), checksum = d.getUint32(offset + 16, true), compressed = d.getUint32(offset + 20, true), original = d.getUint32(offset + 24, true);
    const n = d.getUint16(offset + 28, true), extra = d.getUint16(offset + 30, true), comment = d.getUint16(offset + 32, true), local = d.getUint32(offset + 42, true);
    if (offset + 46 + n + extra + comment > start2 + size)
      throw new Error("Truncated ZIP directory");
    const name = safePath(
      decoder.decode(bytes.subarray(offset + 46, offset + 46 + n))
    );
    if (seen.has(name)) throw new Error("Duplicate archive entry");
    seen.add(name);
    if (flags & 1 || ![0, 8].includes(method))
      throw new Error("Encrypted or unsupported ZIP compression");
    total += original;
    assertMemory(
      limits,
      MEMORY_OVERHEAD + buffer.byteLength + total * 4,
      "expanded archive"
    );
    if (total > limits.max_uncompressed_bytes)
      throw new Error("Archive expansion limit exceeded");
    entries.push({ name, method, checksum, compressed, original, local });
    offset += 46 + n + extra + comment;
  }
  if (offset !== start2 + size) throw new Error("ZIP directory size mismatch");
  const files = /* @__PURE__ */ new Map();
  for (const e of entries) {
    const o = e.local;
    if (o + 30 > start2 || d.getUint32(o, true) !== 67324752)
      throw new Error("Invalid ZIP local header");
    const n = d.getUint16(o + 26, true), extra = d.getUint16(o + 28, true), dataStart = o + 30 + n + extra;
    if (dataStart + e.compressed > start2 || d.getUint16(o + 8, true) !== e.method || d.getUint16(o + 6, true) & 1 || decoder.decode(bytes.subarray(o + 30, o + 30 + n)) !== e.name)
      throw new Error("ZIP header mismatch");
    const out = new Uint8Array(e.original);
    let written = 0, state = 4294967295, finished = false;
    const consume = (chunk, final) => {
      if (written + chunk.length > out.length)
        throw new Error("ZIP entry exceeds declared size");
      out.set(chunk, written);
      written += chunk.length;
      state = crc(chunk, state);
      finished = final;
    };
    if (e.method === 0)
      consume(bytes.subarray(dataStart, dataStart + e.compressed), true);
    else {
      const inflate = new Inflate(consume);
      for (let p = 0; p < e.compressed; p += 1024)
        inflate.push(
          bytes.subarray(
            dataStart + p,
            dataStart + Math.min(p + 1024, e.compressed)
          ),
          p + 1024 >= e.compressed
        );
    }
    if (!finished || written !== e.original || (state ^ 4294967295) >>> 0 !== e.checksum)
      throw new Error("ZIP checksum or length mismatch");
    if (!e.name.endsWith("/")) files.set(e.name, out);
  }
  return files;
}
function parseXML(bytes, open2, close = () => {
}) {
  const parser = new import_saxes.SaxesParser({ xmlns: true });
  parser.on("doctype", () => {
    throw new Error("XML document types are not supported");
  });
  parser.on("error", (error) => {
    throw error;
  });
  parser.on("opentag", (tag) => {
    const a = /* @__PURE__ */ Object.create(null);
    for (const v of Object.values(tag.attributes)) a[v.local] = v.value;
    open2(tag.local, a, tag);
  });
  parser.on("closetag", (tag) => close(tag.local));
  parser.write(decoder.decode(bytes)).close();
}
function matrix(value) {
  if (!value) return identity();
  const v = value.trim().split(/\s+/).map(Number);
  if (v.length !== 12 || v.some((x2) => !Number.isFinite(x2)))
    throw new Error("Invalid 3MF transform");
  return new Float64Array([
    v[0],
    v[1],
    v[2],
    0,
    v[3],
    v[4],
    v[5],
    0,
    v[6],
    v[7],
    v[8],
    0,
    v[9],
    v[10],
    v[11],
    1
  ]);
}
function parse3MF(buffer, limits = DEFAULT_LIMITS) {
  const files = unzipChecked(buffer, limits);
  const baseMemory = MEMORY_OVERHEAD + buffer.byteLength + [...files.values()].reduce((sum, b) => sum + b.byteLength * 3, 0);
  let path = null;
  if (files.has("_rels/.rels"))
    parseXML(files.get("_rels/.rels"), (name, a) => {
      if (name === "Relationship" && a.Type?.endsWith("/3dmodel")) {
        if (a.TargetMode === "External")
          throw new Error("External 3MF resources are unsupported");
        path = safePath(a.Target.replace(/^\//, ""));
      }
    });
  path ??= [...files.keys()].find((k) => /^3d\/3dmodel\.model$/i.test(k));
  if (!path || !files.has(path)) throw new Error("3MF model part not found");
  const objects = /* @__PURE__ */ new Map(), materials = /* @__PURE__ */ new Map(), build = [];
  let current = null, resource = null, inBuild = false, unit = 1, triangles = 0, vertices = 0, root = false;
  parseXML(
    files.get(path),
    (name, a, tag) => {
      if (name === "model") {
        if (root) throw new Error("Multiple 3MF roots");
        root = true;
        const scales = {
          micron: 1e-3,
          millimeter: 1,
          centimeter: 10,
          inch: 25.4,
          foot: 304.8,
          meter: 1e3
        };
        unit = scales[a.unit || "millimeter"];
        if (!unit) throw new Error("Unsupported 3MF unit");
        for (const prefix of (a.requiredextensions || "").split(/\s+/).filter(Boolean))
          if (!/material\/2015\/02$/.test(tag.ns[prefix] || ""))
            throw new Error(`Unsupported required 3MF extension: ${prefix}`);
      } else if (name === "object") {
        if (objects.has(a.id)) throw new Error("Duplicate 3MF object");
        current = {
          id: a.id,
          vertices: [],
          triangles: [],
          components: [],
          pid: a.pid,
          pindex: a.pindex
        };
        objects.set(a.id, current);
      } else if (name === "vertex" && current) {
        const p = [Number(a.x), Number(a.y), Number(a.z)];
        if (p.some((v) => !Number.isFinite(v)))
          throw new Error("Invalid 3MF vertex");
        current.vertices.push(p);
        if (++vertices > limits.max_triangles * 3)
          throw new Error("3MF vertex limit exceeded");
        assertMemory(limits, baseMemory + vertices * 128 + triangles * 320);
      } else if (name === "triangle" && current) {
        current.triangles.push(a);
        if (++triangles > limits.max_triangles)
          throw new Error("Triangle limit exceeded");
        assertMemory(limits, baseMemory + vertices * 128 + triangles * 320);
      } else if (name === "component" && current) {
        if (a.path) throw new Error("External 3MF components are unsupported");
        current.components.push({
          id: a.objectid,
          matrix: matrix(a.transform)
        });
      } else if (name === "build") inBuild = true;
      else if (name === "item" && inBuild) {
        if (a.path) throw new Error("External 3MF build items are unsupported");
        if (a.printable !== "0")
          build.push({ id: a.objectid, matrix: matrix(a.transform) });
      } else if (name === "basematerials" || name === "colorgroup") {
        resource = [];
        materials.set(a.id, resource);
      } else if ((name === "base" || name === "color") && resource) {
        const color = a.displaycolor || a.color;
        if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(color || ""))
          throw new Error("Invalid 3MF color");
        resource.push(colorRGB(color.slice(0, 7)));
      } else if (name === "texture2d" || name === "texture2dgroup" || name === "multiproperties")
        throw new Error(
          "3MF textures and composite materials are not supported"
        );
    },
    (name) => {
      if (name === "object") current = null;
      if (name === "build") inBuild = false;
      if (name === "basematerials" || name === "colorgroup") resource = null;
    }
  );
  if (!root || !build.length) throw new Error("3MF build is empty");
  const instances = [];
  let total = 0, visits = 0;
  const visit = (id, parent, stack) => {
    if (stack.includes(id) || stack.length >= 64)
      throw new Error("Cyclic or excessively nested 3MF components");
    if (++visits > limits.max_archive_entries * 1024)
      throw new Error("3MF component expansion limit exceeded");
    const obj = objects.get(id);
    if (!obj) throw new Error("Missing 3MF object");
    total += obj.triangles.length;
    if (total > limits.max_triangles)
      throw new Error("Expanded triangle limit exceeded");
    assertMemory(
      limits,
      baseMemory + vertices * 128 + triangles * 320 + total * TRIANGLE_MEMORY,
      "expanded model"
    );
    if (obj.triangles.length) instances.push({ obj, matrix: parent });
    for (const c of obj.components)
      visit(c.id, multiply(parent, c.matrix), [...stack, id]);
  };
  for (const item of build) visit(item.id, item.matrix, []);
  const positions = new Float32Array(total * 9), colors = new Float32Array(total * 9);
  let index = 0, hasColors = false;
  for (const instance of instances)
    for (const face of instance.obj.triangles) {
      for (let k = 0; k < 3; k++) {
        const id = Number(face[`v${k + 1}`]);
        if (!Number.isInteger(id) || id < 0 || id >= instance.obj.vertices.length)
          throw new Error("Invalid 3MF triangle index");
        positions.set(
          transform(instance.matrix, instance.obj.vertices[id]).map(
            (v) => v * unit
          ),
          index
        );
        const pid = face.pid ?? instance.obj.pid, pindex = Number(
          face[`p${k + 1}`] ?? face.p1 ?? instance.obj.pindex ?? 0
        );
        let color = [144 / 255, 144 / 255, 144 / 255];
        if (pid !== void 0) {
          color = materials.get(pid)?.[pindex];
          if (!color)
            throw new Error("Unsupported or invalid 3MF material reference");
          hasColors = true;
        }
        colors.set(color, index);
        index += 3;
      }
    }
  return {
    ...finishGeometry(positions, hasColors ? colors : null, limits),
    format: "3mf"
  };
}

// src/cad.js
var CAD_OVERHEAD = 128 * 1024 ** 2;
function cadMemory(inputBytes) {
  return CAD_OVERHEAD + inputBytes * 40;
}
async function loadCAD(options) {
  const { default: factory } = await import(new URL("../cad/occt-import-js.js", import.meta.url).href);
  return factory({
    ...options,
    locateFile: () => new URL("../cad/occt-import-js.wasm", import.meta.url).href
  });
}
function cadGeometry(result, limits = DEFAULT_LIMITS, workingBytes = 0) {
  if (!result?.success || !Array.isArray(result.meshes) || !result.meshes.length)
    throw new Error(
      "No supported surfaces were found in this CAD file. Export a self-contained STEP or IGES solid/surface model."
    );
  let triangles = 0, arrayBytes = 0, hasColors = false;
  for (const mesh of result.meshes) {
    const positions2 = mesh.attributes?.position?.array, indices = mesh.index?.array;
    if (!positions2?.length || positions2.length % 3 || !indices || indices.length % 3)
      throw new Error("Invalid CAD mesh");
    triangles += indices.length / 3;
    if (!Number.isSafeInteger(triangles) || triangles > limits.max_triangles)
      throw new Error("Triangle limit exceeded");
    arrayBytes += (positions2.length + indices.length + (mesh.attributes.normal?.array?.length || 0)) * 16;
    hasColors ||= !!mesh.color || !!mesh.brep_faces?.some((face) => face.color);
  }
  if (!triangles)
    throw new Error("This CAD file contains no viewable surfaces.");
  assertMemory(
    limits,
    workingBytes + arrayBytes + triangles * TRIANGLE_MEMORY,
    "CAD model"
  );
  const positions = new Float32Array(triangles * 9);
  const colors = hasColors ? new Float32Array(positions.length) : null;
  const fallback = [144 / 255, 144 / 255, 144 / 255];
  let offset = 0;
  function colorAt(color, start2, end) {
    if (!color || color.length !== 3 || color.some((v) => !Number.isFinite(v) || v < 0 || v > 1))
      throw new Error("Invalid CAD color");
    for (let p = start2; p < end; p += 3) colors.set(color, p);
  }
  for (const mesh of result.meshes) {
    const source = mesh.attributes.position.array, indices = mesh.index.array;
    for (let i2 = 0; i2 < indices.length; i2++) {
      const index = indices[i2];
      if (!Number.isSafeInteger(index) || index < 0 || index * 3 + 2 >= source.length)
        throw new Error("Invalid CAD triangle index");
      for (let axis = 0; axis < 3; axis++)
        positions[offset + i2 * 3 + axis] = source[index * 3 + axis];
    }
    if (colors) {
      colorAt(mesh.color || fallback, offset, offset + indices.length * 3);
      for (const face of mesh.brep_faces || []) {
        if (!face.color) continue;
        if (!Number.isSafeInteger(face.first) || !Number.isSafeInteger(face.last) || face.first < 0 || face.last < face.first || face.last >= indices.length / 3)
          throw new Error("Invalid CAD face range");
        colorAt(
          face.color,
          offset + face.first * 9,
          offset + (face.last + 1) * 9
        );
      }
    }
    offset += indices.length * 3;
  }
  return finishGeometry(positions, colors, limits);
}
async function parseCAD(buffer, name, limits = DEFAULT_LIMITS, progress2 = () => {
}, initialize = loadCAD) {
  const extension = /\.(step|stp|iges|igs)(?:[?#]|$)/i.exec(name)?.[1].toLowerCase();
  if (!extension) throw new Error("Unsupported CAD format");
  if (!(buffer instanceof ArrayBuffer) || !buffer.byteLength || buffer.byteLength > limits.max_file_bytes)
    throw new Error("Invalid or oversized CAD file");
  assertMemory(limits, cadMemory(buffer.byteLength), "CAD file");
  const heapLimit = Math.floor(
    Math.min(
      512 * 1024 ** 2,
      ((limits.max_memory_bytes ?? Number.MAX_SAFE_INTEGER) - CAD_OVERHEAD - buffer.byteLength * 3) / 2
    ) / 65536
  ) * 65536;
  if (heapLimit < 32 * 1024 ** 2)
    throw new Error("CAD import exceeds the device safety budget.");
  progress2("loading-cad");
  let engine;
  try {
    engine = await initialize({
      viewstlMaxHeapBytes: heapLimit,
      print() {
      },
      printErr() {
      }
    });
  } catch {
    throw new Error(
      "The CAD reader could not start. Check the connection and that WebAssembly is allowed, then try again."
    );
  }
  progress2("parsing-cad");
  const format = /^(step|stp)$/.test(extension) ? "step" : "iges";
  let result;
  try {
    result = engine[format === "step" ? "ReadStepFile" : "ReadIgesFile"](
      new Uint8Array(buffer),
      {
        linearUnit: "millimeter",
        linearDeflectionType: "bounding_box_ratio",
        linearDeflection: 1e-3,
        angularDeflection: 0.5
      }
    );
  } catch {
    throw new Error(
      "This CAD file could not be processed within the reader limits. Try a smaller or simplified STEP/IGES export."
    );
  }
  const geometry = cadGeometry(
    result,
    limits,
    CAD_OVERHEAD + buffer.byteLength * 3 + engine.HEAPU8.byteLength
  );
  return { ...geometry, format, units: "mm" };
}

// src/print-options.js
function printOptions(input = {}) {
  const level = input.level ?? "basic";
  if (!["basic", "detailed"].includes(level))
    throw new Error("Choose basic or detailed print checks");
  const number = (v, name, max2 = 1e9) => {
    if (!Number.isFinite(v) || v <= 0 || v > max2)
      throw new Error(`Invalid ${name}`);
    return v;
  };
  let profile = null;
  if (input.profile != null) {
    if (input.profile.technology !== "fdm")
      throw new Error("Only FDM profiles are supported");
    profile = { technology: "fdm" };
    for (const key of ["min_wall_mm", "line_width_mm"])
      if (input.profile[key] != null)
        profile[key] = number(input.profile[key], key);
    if (input.profile.overhang_degrees != null)
      profile.overhang_degrees = number(
        input.profile.overhang_degrees,
        "overhang angle",
        89.9
      );
    if (input.profile.build_volume_mm != null) {
      if (!Array.isArray(input.profile.build_volume_mm) || input.profile.build_volume_mm.length !== 3)
        throw new Error("Build volume requires X, Y and Z");
      profile.build_volume_mm = input.profile.build_volume_mm.map(
        (v) => number(v, "build volume")
      );
    }
  }
  const time = number(input.max_time_ms ?? 3e4, "check time limit", 12e4);
  return {
    level,
    profile,
    apply_transforms: input.apply_transforms !== false,
    units_confirmed: input.units_confirmed === true,
    max_time_ms: time
  };
}
var printMemory = (triangles) => 64 * 1024 ** 2 + triangles * 2400;

// src/print-spatial.js
var sub = (a, b) => a.map((v, i2) => v - b[i2]);
var dot = (a, b) => a.reduce((s, v, i2) => s + v * b[i2], 0);
var cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
function triangleAt(p, i2) {
  return [0, 3, 6].map((k) => Array.from(p.subarray(i2 * 9 + k, i2 * 9 + k + 3)));
}
function makeTree(p, tick) {
  const count = p.length / 9, boxes = new Float64Array(count * 6);
  for (let i2 = 0; i2 < count; i2++) {
    if (i2 % 1024 === 0) tick();
    for (let a = 0; a < 3; a++) {
      boxes[i2 * 6 + a] = Math.min(
        p[i2 * 9 + a],
        p[i2 * 9 + 3 + a],
        p[i2 * 9 + 6 + a]
      );
      boxes[i2 * 6 + a + 3] = Math.max(
        p[i2 * 9 + a],
        p[i2 * 9 + 3 + a],
        p[i2 * 9 + 6 + a]
      );
    }
  }
  const ids = Uint32Array.from({ length: count }, (_, i2) => i2);
  const build = (start2, end) => {
    tick();
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let j = start2; j < end; j++)
      for (let a = 0; a < 3; a++) {
        b[a] = Math.min(b[a], boxes[ids[j] * 6 + a]);
        b[a + 3] = Math.max(b[a + 3], boxes[ids[j] * 6 + a + 3]);
      }
    const node = { b, start: start2, end };
    if (end - start2 > 16) {
      const extent = [0, 1, 2].map((a) => b[a + 3] - b[a]), axis = extent.indexOf(Math.max(...extent));
      ids.subarray(start2, end).sort(
        (a, c) => boxes[a * 6 + axis] + boxes[a * 6 + axis + 3] - (boxes[c * 6 + axis] + boxes[c * 6 + axis + 3])
      );
      const mid = start2 + end >>> 1;
      node.left = build(start2, mid);
      node.right = build(mid, end);
    }
    return node;
  };
  return { root: build(0, count), ids, boxes };
}
var overlap = (a, b, e) => [0, 1, 2].every((k) => a[k] <= b[k + 3] + e && a[k + 3] + e >= b[k]);
function visitPairs(tree, eps, visit, tick) {
  const walk = (a, b, same) => {
    tick();
    if (!overlap(a.b, b.b, eps)) return;
    if (!a.left && !b.left) {
      for (let i2 = a.start; i2 < a.end; i2++)
        for (let j = b.start; j < b.end; j++) {
          const x2 = tree.ids[i2], y = tree.ids[j];
          if (same && x2 >= y) continue;
          if (overlap(
            tree.boxes.subarray(x2 * 6, x2 * 6 + 6),
            tree.boxes.subarray(y * 6, y * 6 + 6),
            eps
          ))
            visit(x2, y);
        }
    } else if (same) {
      walk(a.left, a.left, true);
      walk(a.left, a.right, false);
      walk(a.right, a.right, true);
    } else if (a.left && (!b.left || a.end - a.start >= b.end - b.start)) {
      walk(a.left, b, false);
      walk(a.right, b, false);
    } else {
      walk(a, b.left, false);
      walk(a, b.right, false);
    }
  };
  walk(tree.root, tree.root, true);
}
var orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function trianglesIntersect(a, b, shared, eps) {
  const na = cross(sub(a[1], a[0]), sub(a[2], a[0])), nb = cross(sub(b[1], b[0]), sub(b[2], b[0]));
  const la = Math.hypot(...na), lb = Math.hypot(...nb);
  if (!la || !lb) return 0;
  const da = b.map((p) => dot(sub(p, a[0]), na) / la), db = a.map((p) => dot(sub(p, b[0]), nb) / lb);
  if ([da, db].some((d) => d.every((v) => v > eps) || d.every((v) => v < -eps)))
    return 0;
  const line = cross(
    na.map((v) => v / la),
    nb.map((v) => v / lb)
  );
  if (Math.hypot(...line) < 1e-10) {
    if (Math.max(...da.map(Math.abs)) > eps) return 0;
    const axis = na.map(Math.abs).indexOf(Math.max(...na.map(Math.abs))), project = (p) => p.filter((_, k) => k !== axis);
    if (shared >= 2) {
      const same = (p, q) => p.every((v, k) => v === q[k]);
      const common = a.filter((p) => b.some((q) => same(p, q)));
      if (common.length === 3) return 1;
      if (common.length === 2) {
        const otherA = a.find((p) => !common.some((q) => same(p, q)));
        const otherB = b.find((p) => !common.some((q) => same(p, q)));
        return orient(project(common[0]), project(common[1]), project(otherA)) * orient(project(common[0]), project(common[1]), project(otherB)) > 0 ? 1 : 0;
      }
    }
    let polygon = a.map(project);
    const clip = b.map(project), sign = Math.sign(orient(...clip));
    for (let k = 0; k < 3 && polygon.length; k++) {
      const u = clip[k], v = clip[(k + 1) % 3], out = [];
      for (let j = 0; j < polygon.length; j++) {
        const s = polygon[j], t = polygon[(j + 1) % polygon.length], ds = sign * orient(u, v, s), dt = sign * orient(u, v, t);
        if (ds >= 0) out.push(s);
        if (ds >= 0 !== dt >= 0) {
          const f = ds / (ds - dt);
          out.push(s.map((x3, i2) => x3 + (t[i2] - x3) * f));
        }
      }
      polygon = out;
    }
    const area = Math.abs(
      polygon.reduce((s, p, i2) => {
        const q = polygon[(i2 + 1) % polygon.length];
        const o = polygon[0];
        return s + (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
      }, 0)
    ) / 2;
    return area > eps * eps * 4 ? 1 : 0;
  }
  if (shared >= 2) return 0;
  const direction = line.map((v) => v / Math.hypot(...line));
  const interval = (tri, d) => {
    const hits = [];
    for (let k = 0; k < 3; k++) {
      if (Math.abs(d[k]) <= eps) hits.push(dot(tri[k], direction));
      const j = (k + 1) % 3;
      if (d[k] * d[j] < 0) {
        const f = d[k] / (d[k] - d[j]);
        hits.push(
          dot(
            tri[k].map((v, i2) => v + (tri[j][i2] - v) * f),
            direction
          )
        );
      }
    }
    return hits.length ? [Math.min(...hits), Math.max(...hits)] : null;
  };
  const x2 = interval(a, db), y = interval(b, da);
  if (!x2 || !y) return 0;
  const length = Math.min(x2[1], y[1]) - Math.max(x2[0], y[0]);
  return length > eps ? 1 : shared ? 0 : length >= -eps ? 2 : 0;
}
function rayHit(o, d, tri, eps) {
  const e1 = sub(tri[1], tri[0]), e2 = sub(tri[2], tri[0]), h = cross(d, e2), det = dot(e1, h);
  if (Math.abs(det) <= Math.hypot(...e1) * Math.hypot(...e2) * 1e-12)
    return null;
  const s = sub(o, tri[0]), u = dot(s, h) / det, q = cross(s, e1), v = dot(d, q) / det, t = dot(e2, q) / det;
  if (u < -1e-10 || v < -1e-10 || u + v > 1 + 1e-10 || t <= eps) return null;
  return { t, edge: Math.min(u, v, 1 - u - v) < 1e-8 };
}
function rayBox2(o, d, b, eps) {
  let lo = 0, hi = Infinity;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-15) {
      if (o[k] < b[k] - eps || o[k] > b[k + 3] + eps) return false;
    } else {
      const x2 = (b[k] - eps - o[k]) / d[k], y = (b[k + 3] + eps - o[k]) / d[k];
      lo = Math.max(lo, Math.min(x2, y));
      hi = Math.min(hi, Math.max(x2, y));
      if (lo > hi) return false;
    }
  }
  return true;
}
function rayQuery(tree, p, o, d, eps, accept, tick) {
  const hits = [];
  const walk = (node) => {
    tick();
    if (!rayBox2(o, d, node.b, eps)) return;
    if (node.left) {
      walk(node.left);
      walk(node.right);
    } else
      for (let j = node.start; j < node.end; j++) {
        const id = tree.ids[j];
        if (!accept(id)) continue;
        const h = rayHit(o, d, triangleAt(p, id), eps);
        if (h) hits.push({ ...h, id });
      }
  };
  walk(tree.root);
  return hits;
}

// src/print-check.js
var definitions = [
  ["degenerate_faces", "Degenerate triangles", "error"],
  ["near_degenerate_faces", "Very small or thin triangles", "warning"],
  ["duplicate_faces", "Duplicate triangles", "error"],
  ["boundary_edges", "Open boundaries", "error"],
  ["nonmanifold_edges", "Non-manifold edges", "error"],
  ["nonmanifold_vertices", "Non-manifold vertices", "error"],
  ["winding", "Triangle winding", "error"],
  ["components", "Separate connected parts", "info"],
  ["intersections", "Self-intersections", "error"],
  ["shell_orientation", "Shell orientation and volume", "error"],
  ["units", "Physical units", "warning"],
  ["build_volume", "Build volume fit", "warning"],
  ["overhangs", "Overhangs", "warning"],
  ["bed_contact", "Bed contact", "warning"],
  ["thin_walls", "Thin walls / small features", "warning"]
];
function checkMesh(model, input = {}, limits = {}, progress2 = () => {
}) {
  const settings = printOptions(input), n = model.positions.length / 9;
  if (!(model.positions instanceof Float32Array) || !Number.isSafeInteger(n) || n < 1 || model.matrix?.length !== 16 || Array.from(model.matrix).some((v) => !Number.isFinite(v)))
    throw new Error("Invalid print-check geometry");
  if (n > (limits.max_triangles ?? 5e6))
    throw new Error("Print check triangle limit exceeded");
  assertMemory(limits, printMemory(n), "print check");
  const start2 = performance.now(), deadline = start2 + settings.max_time_ms;
  let ticks = 0, stage = "Topology";
  const tick = () => {
    if (++ticks % 128 === 0) {
      if (performance.now() > deadline) throw new Error("PRINT_TIME_LIMIT");
      progress2({ phase: stage, elapsed_ms: performance.now() - start2 });
    }
  };
  const checks = definitions.map(([code, label, severity]) => ({
    code,
    label,
    severity,
    status: "not_run",
    count: 0,
    triangle_ids: [],
    edge_vertices: [],
    message: "Not run"
  }));
  const get = (code) => checks.find((c) => c.code === code);
  const mark = (code, status, message) => Object.assign(get(code), { status, message });
  const issue = (code, face) => {
    const c = get(code);
    c.count++;
    if (face != null && c.triangle_ids.length < 128) c.triangle_ids.push(face);
  };
  const finish = (code, message) => {
    const c = get(code);
    c.status = c.count ? "issue" : "pass";
    c.message = message || `${c.count} found`;
  };
  const positions = new Float64Array(model.positions.length), min = [Infinity, Infinity, Infinity], max2 = [-Infinity, -Infinity, -Infinity];
  let topologyComplete = false, tree, volumes = [], componentFaces = [], rootOf, eps = 0;
  const report = {
    model_id: model.id,
    name: model.name,
    triangles: n,
    checks,
    settings,
    dimensions_mm: null,
    volume_mm3: null,
    volume_valid: false,
    elapsed_ms: 0,
    summary: "incomplete"
  };
  try {
    progress2({ phase: stage, elapsed_ms: 0 });
    for (let i2 = 0; i2 < model.positions.length; i2 += 3) {
      if (i2 % 3072 === 0) tick();
      const p = transform(
        model.matrix,
        Array.from(model.positions.subarray(i2, i2 + 3))
      );
      if (p.some((v) => !Number.isFinite(v)))
        throw new Error("Invalid print-check coordinate");
      positions.set(p, i2);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max2[k] = Math.max(max2[k], p[k]);
      }
    }
    report.dimensions_mm = max2.map((v, k) => v - min[k]);
    const span = Math.max(...report.dimensions_mm), magnitude = Math.max(...min.map(Math.abs), ...max2.map(Math.abs));
    eps = Math.max(span * 1e-10, magnitude * Number.EPSILON * 64, 1e-12);
    report.tolerance_mm = eps;
    for (let i2 = 0; i2 < positions.length; i2++) positions[i2] -= min[i2 % 3];
    const ids = new Uint32Array(n * 3), vertices = [], lookup = /* @__PURE__ */ new Map(), edges = /* @__PURE__ */ new Map(), faces = /* @__PURE__ */ new Map(), incidence = [];
    const parents = Int32Array.from({ length: n }, (_, i2) => i2);
    const find = (i2) => {
      while (parents[i2] !== i2) {
        parents[i2] = parents[parents[i2]];
        i2 = parents[i2];
      }
      return i2;
    };
    const join = (a, b) => {
      a = find(a);
      b = find(b);
      if (a !== b) parents[b] = a;
    };
    for (let i2 = 0; i2 < n; i2++) {
      tick();
      for (let k = 0; k < 3; k++) {
        const offset = i2 * 9 + k * 3, key2 = Array.from(model.positions.subarray(offset, offset + 3)).join(
          ","
        );
        let id = lookup.get(key2);
        if (id === void 0) {
          id = vertices.length;
          lookup.set(key2, id);
          vertices.push(offset);
          incidence.push([]);
        }
        ids[i2 * 3 + k] = id;
        incidence[id].push(i2);
      }
      const tri = triangleAt(positions, i2), normal = cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])), area = Math.hypot(...normal);
      if (!area) issue("degenerate_faces", i2);
      else if (area <= eps * Math.max(
        ...tri.map((p, k) => Math.hypot(...sub(p, tri[(k + 1) % 3])))
      ))
        issue("near_degenerate_faces", i2);
      const key = Array.from(ids.subarray(i2 * 3, i2 * 3 + 3)).sort((a, b) => a - b).join(":");
      if (faces.has(key)) issue("duplicate_faces", i2);
      else faces.set(key, i2);
      for (let k = 0; k < 3; k++) {
        const a = ids[i2 * 3 + k], b = ids[i2 * 3 + (k + 1) % 3], key2 = Math.min(a, b) + ":" + Math.max(a, b);
        let edge = edges.get(key2);
        if (!edge) {
          edge = { a, b, faces: [], direction: 0 };
          edges.set(key2, edge);
        }
        if (edge.faces.length) join(i2, edge.faces[0]);
        edge.faces.push(i2);
        edge.direction += a < b ? 1 : -1;
      }
    }
    const badVertices = /* @__PURE__ */ new Set();
    for (const edge of edges.values()) {
      tick();
      let code;
      if (edge.faces.length === 1) code = "boundary_edges";
      else if (edge.faces.length !== 2) {
        code = "nonmanifold_edges";
        badVertices.add(edge.a);
        badVertices.add(edge.b);
      } else if (edge.direction !== 0) code = "winding";
      if (code) {
        issue(code, edge.faces[0]);
        const c = get(code);
        if (c.edge_vertices.length < 256 * 6)
          c.edge_vertices.push(
            ...model.positions.subarray(vertices[edge.a], vertices[edge.a] + 3),
            ...model.positions.subarray(vertices[edge.b], vertices[edge.b] + 3)
          );
      }
    }
    for (let v = 0; v < incidence.length; v++) {
      tick();
      if (badVertices.has(v)) {
        issue("nonmanifold_vertices", incidence[v][0]);
        continue;
      }
      const around = new Set(incidence[v]), seen = /* @__PURE__ */ new Set(), stack = [incidence[v][0]];
      while (stack.length) {
        tick();
        const f = stack.pop();
        if (seen.has(f)) continue;
        seen.add(f);
        for (let k = 0; k < 3; k++) {
          const a = ids[f * 3 + k], b = ids[f * 3 + (k + 1) % 3];
          if (a !== v && b !== v) continue;
          const e = edges.get(Math.min(a, b) + ":" + Math.max(a, b));
          for (const next of e.faces) if (!seen.has(next)) stack.push(next);
        }
      }
      if (seen.size !== around.size)
        issue("nonmanifold_vertices", incidence[v][0]);
    }
    const roots = /* @__PURE__ */ new Map();
    rootOf = new Int32Array(n);
    for (let i2 = 0; i2 < n; i2++) {
      tick();
      const r = find(i2);
      if (!roots.has(r)) {
        roots.set(r, roots.size);
        componentFaces.push([]);
        volumes.push(0);
      }
      const c = roots.get(r);
      rootOf[i2] = c;
      componentFaces[c].push(i2);
      const tri = triangleAt(positions, i2), origin = triangleAt(positions, componentFaces[c][0])[0];
      volumes[c] += dot(
        sub(tri[0], origin),
        cross(sub(tri[1], origin), sub(tri[2], origin))
      ) / 6;
    }
    for (const code of [
      "degenerate_faces",
      "near_degenerate_faces",
      "duplicate_faces",
      "boundary_edges",
      "nonmanifold_edges",
      "nonmanifold_vertices",
      "winding"
    ])
      finish(code);
    get("components").count = roots.size;
    mark(
      "components",
      roots.size > 1 ? "issue" : "pass",
      `${roots.size} connected part${roots.size === 1 ? "" : "s"}. Separate parts can be intentional.`
    );
    topologyComplete = true;
    mark(
      "units",
      model.source_units || settings.units_confirmed ? "pass" : "inconclusive",
      model.source_units ? `File units: ${model.source_units}; measurements in mm.` : settings.units_confirmed ? "Current scale confirmed as millimetres." : "File has no physical units. Confirm the current millimetre scale before using size estimates."
    );
    const profile = settings.profile;
    if (profile?.build_volume_mm) {
      get("build_volume").count = report.dimensions_mm.filter(
        (v, k) => v > profile.build_volume_mm[k] + eps
      ).length;
      finish(
        "build_volume",
        get("build_volume").count ? "Exceeds the supplied build volume in the current orientation. Try another orientation or scale in your slicer." : "Fits by dimensions only in the current orientation; placement and printer exclusions are not checked."
      );
    }
    const solidBasics = checks.filter((c) => c.severity === "error" && c.status !== "not_run").every((c) => c.status === "pass");
    if (settings.level === "detailed") {
      stage = "Spatial index";
      tree = makeTree(positions, tick);
      stage = "Self-intersections";
      let uncertain = 0;
      visitPairs(
        tree,
        eps,
        (a, b) => {
          tick();
          const shared = Array.from(ids.subarray(a * 3, a * 3 + 3)).filter(
            (v) => ids.subarray(b * 3, b * 3 + 3).includes(v)
          ).length;
          const hit = trianglesIntersect(
            triangleAt(positions, a),
            triangleAt(positions, b),
            shared,
            eps
          );
          if (hit === 1) {
            issue("intersections", a);
            const c = get("intersections");
            if (c.triangle_ids.length < 128) c.triangle_ids.push(b);
          } else if (hit === 2) uncertain++;
        },
        tick
      );
      finish("intersections");
      if (uncertain && !get("intersections").count)
        mark(
          "intersections",
          "inconclusive",
          `${uncertain} near-contact pairs require inspection at the reported numerical tolerance.`
        );
      if (solidBasics && get("intersections").status === "pass") {
        stage = "Shell containment";
        let ambiguous = false;
        for (let c = 0; c < componentFaces.length; c++) {
          tick();
          const tri = triangleAt(positions, componentFaces[c][0]), point = [0, 1, 2].map(
            (k) => (tri[0][k] + tri[1][k] + tri[2][k]) / 3
          );
          let depth = null;
          for (const direction of [
            [1, 0.371, 0.529],
            [0.217, 1, 0.413],
            [0.317, 0.193, 1]
          ]) {
            const hits = rayQuery(
              tree,
              positions,
              point,
              direction,
              eps,
              (id) => rootOf[id] !== c,
              tick
            );
            if (hits.some((h) => h.edge)) continue;
            const counts = /* @__PURE__ */ new Map();
            for (const h of hits)
              counts.set(rootOf[h.id], (counts.get(rootOf[h.id]) || 0) + 1);
            depth = [...counts.values()].filter((v) => v % 2 === 1).length;
            break;
          }
          if (depth === null) {
            ambiguous = true;
            continue;
          }
          if (Math.abs(volumes[c]) <= eps ** 3 || Math.sign(volumes[c]) !== (depth % 2 ? -1 : 1))
            issue("shell_orientation", componentFaces[c][0]);
        }
        finish(
          "shell_orientation",
          "Outer shells must face outward; cavity shells face inward."
        );
        if (ambiguous && !get("shell_orientation").count)
          mark(
            "shell_orientation",
            "inconclusive",
            "Shell containment is numerically ambiguous."
          );
        if (get("shell_orientation").status === "pass") {
          report.volume_mm3 = volumes.reduce((a, b) => a + b, 0);
          report.volume_valid = true;
        }
      } else
        mark(
          "shell_orientation",
          "inconclusive",
          "Requires a closed, consistently wound mesh without intersections."
        );
    } else
      mark(
        "shell_orientation",
        "not_run",
        "Run Detailed check for intersections, nested shells and validated volume."
      );
    if (profile) {
      stage = "FDM estimates";
      const physical = get("units").status === "pass";
      if (!physical)
        for (const code of ["build_volume", "bed_contact", "thin_walls"])
          mark(code, "inconclusive", "Confirm physical units first.");
      if (profile.overhang_degrees != null) {
        if (!solidBasics || (settings.level === "detailed" ? !report.volume_valid : componentFaces.length !== 1 || volumes[0] <= 0))
          mark(
            "overhangs",
            "inconclusive",
            "Fix triangle winding and mesh defects before estimating overhangs."
          );
        else {
          const threshold = -Math.sin(
            profile.overhang_degrees * Math.PI / 180
          );
          let area = 0;
          for (let i2 = 0; i2 < n; i2++) {
            tick();
            const t = triangleAt(positions, i2), normal = cross(sub(t[1], t[0]), sub(t[2], t[0])), length = Math.hypot(...normal);
            if (t.every((p) => p[2] <= eps * 8)) continue;
            if (normal[2] / length < threshold) {
              issue("overhangs", i2);
              area += length / 2;
            }
          }
          get("overhangs").estimated = true;
          get("overhangs").area_mm2 = area;
          finish(
            "overhangs",
            `Potential support regions above ${profile.overhang_degrees}\xB0 from vertical. +Z is up; bridges/supports are not simulated.`
          );
        }
      }
      if (physical) {
        let contact = 0;
        for (let i2 = 0; i2 < n; i2++) {
          tick();
          const t = triangleAt(positions, i2);
          if (t.every((p) => p[2] <= eps * 8))
            contact += Math.hypot(...cross(sub(t[1], t[0]), sub(t[2], t[0]))) / 2;
        }
        get("bed_contact").area_mm2 = contact;
        get("bed_contact").estimated = true;
        get("bed_contact").count = contact <= eps ** 2 ? 1 : 0;
        finish(
          "bed_contact",
          "Contact area after virtually lowering this model onto an XY bed. Adhesion/stability are not predicted; scene placement is unchanged."
        );
        const threshold = profile.min_wall_mm ?? profile.line_width_mm;
        if (threshold != null && settings.level === "detailed" && report.volume_valid) {
          stage = "Sampled wall thickness";
          let tested = 0, missed = 0, minimum = Infinity;
          const step = Math.max(1, Math.ceil(n / 2048));
          for (let i2 = 0; i2 < n; i2 += step) {
            tick();
            const t = triangleAt(positions, i2), normal = cross(sub(t[1], t[0]), sub(t[2], t[0])), length = Math.hypot(...normal), direction = normal.map((v) => -v / length), point = [0, 1, 2].map((k) => (t[0][k] + t[1][k] + t[2][k]) / 3);
            const hits = rayQuery(
              tree,
              positions,
              point,
              direction,
              eps * 8,
              (id) => id !== i2,
              tick
            ).sort((a, b) => a.t - b.t);
            if (!hits.length || hits[0].edge) {
              missed++;
              continue;
            }
            tested++;
            minimum = Math.min(minimum, hits[0].t);
            if (hits[0].t < threshold) issue("thin_walls", i2);
          }
          Object.assign(get("thin_walls"), {
            estimated: true,
            samples: tested,
            unresolved_samples: missed,
            minimum_sampled_mm: Number.isFinite(minimum) ? minimum : null
          });
          mark(
            "thin_walls",
            get("thin_walls").count ? "issue" : "inconclusive",
            `${tested} face-centre samples; threshold ${threshold} mm. Sampling can miss thin features and does not prove a minimum wall thickness.`
          );
        } else if (threshold != null)
          mark(
            "thin_walls",
            "inconclusive",
            "Requires Detailed check with valid closed volume and confirmed units."
          );
      }
    }
  } catch (error) {
    if (error.message !== "PRINT_TIME_LIMIT") throw error;
    for (const c of checks)
      if (c.status === "not_run")
        c.message = `Time limit reached during ${stage}; this check was not completed.`;
    if (!topologyComplete)
      for (const c of checks.slice(0, 8)) {
        c.status = "inconclusive";
        c.message = "Topology check exceeded the time limit; counts are partial.";
      }
    report.limit_reason = "time";
  }
  const required = checks.slice(0, 11);
  report.summary = checks.some(
    (c) => c.status === "issue" && c.severity !== "info"
  ) ? "issues_found" : required.some((c) => ["not_run", "inconclusive"].includes(c.status)) || checks.some((c) => c.status === "inconclusive") ? "incomplete" : "no_issues_found";
  report.elapsed_ms = performance.now() - start2;
  return report;
}

// src/node/analysis-worker.js
var start = performance.now();
var cadEngine;
var progress = (details) => parentPort.postMessage({
  progress: { ...details, elapsed_ms: performance.now() - start }
});
async function loadFile() {
  if (task.buffer) return task.buffer;
  const before = await stat(task.path);
  if (!before.isFile()) throw new Error("Input must be a regular file");
  const flags = constants.O_RDONLY | (process.platform === "win32" ? 0 : constants.O_NONBLOCK);
  const file = await open(task.path, flags);
  try {
    const info = await file.stat();
    if (!info.isFile()) throw new Error("Input must be a regular file");
    if (info.size > task.limits.max_file_bytes)
      throw Object.assign(new Error("File size limit exceeded"), {
        code: "ERR_FILE_TOO_LARGE"
      });
    assertMemory(task.limits, info.size * 2 + 64 * 1024 ** 2, "file input");
    const bytes = new Uint8Array(info.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await file.read(
        bytes,
        offset,
        Math.min(1024 ** 2, bytes.length - offset),
        offset
      );
      if (!bytesRead) throw new Error("File changed while being read");
      offset += bytesRead;
    }
    if ((await file.read(new Uint8Array(1), 0, 1, offset)).bytesRead)
      throw new Error("File changed while being read");
    return bytes.buffer;
  } finally {
    await file.close();
  }
}
async function initializeCAD(options) {
  const { default: factory } = await import(new URL("../cad/occt-import-js.js", import.meta.url).href);
  const wasmBinary = await readFile(
    new URL("../cad/occt-import-js.wasm", import.meta.url)
  );
  cadEngine = await factory({ ...options, wasmBinary });
  return cadEngine;
}
try {
  progress({ phase: "reading" });
  const buffer = await loadFile();
  const fileBytes = buffer.byteLength;
  progress({ phase: "parsing", loaded: fileBytes, total: fileBytes });
  const name = `model.${task.format}`;
  const geometry = ["step", "iges"].includes(task.format) ? await parseCAD(
    buffer,
    name,
    task.limits,
    (phase) => progress({ phase }),
    initializeCAD
  ) : task.format === "3mf" ? parse3MF(buffer, task.limits) : parseGeometry(buffer, name, task.limits);
  const cadBytes = cadEngine ? 128 * 1024 ** 2 + cadEngine.HEAPU8.byteLength : 0;
  assertMemory(
    task.limits,
    fileBytes + cadBytes + geometryMemory(geometry) + printMemory(geometry.triangles),
    "analysis"
  );
  const fileUnits = task.format === "3mf" ? "mm" : geometry.units;
  const units = fileUnits ?? task.units ?? null;
  const scale = fileUnits ? 1 : { mm: 1, cm: 10, m: 1e3, in: 25.4, ft: 304.8, um: 1e-3 }[units] ?? 1;
  const matrix2 = identity();
  matrix2[0] = matrix2[5] = matrix2[10] = scale;
  const report = checkMesh(
    {
      id: 0,
      name: task.filename,
      positions: geometry.positions,
      matrix: matrix2,
      source_units: units
    },
    task.checks,
    task.limits,
    progress
  );
  if (!units) {
    delete report.tolerance_mm;
    for (const check of report.checks) delete check.area_mm2;
  } else if (!fileUnits) {
    const unitCheck = report.checks.find((check) => check.code === "units");
    if (unitCheck.status === "pass")
      unitCheck.message = `Input scale supplied as ${units}; measurements normalized to mm.`;
  }
  const area = geometry.area * scale ** 2;
  if (!Number.isFinite(area))
    throw new Error("Surface area exceeds numeric limits");
  const result = {
    ...report,
    schema_version: 1,
    filename: task.filename,
    format: task.format,
    file_bytes: fileBytes,
    units: units ? "mm" : null,
    units_source: fileUnits ? "file" : task.units ? "option" : null,
    dimensions: report.dimensions_mm,
    surface_area: area,
    volume: report.volume_valid ? report.volume_mm3 : null,
    dimensions_mm: units ? report.dimensions_mm : null,
    surface_area_mm2: units ? area : null,
    volume_mm3: units && report.volume_valid ? report.volume_mm3 : null,
    elapsed_ms: performance.now() - start
  };
  parentPort.postMessage({ result });
} catch (error) {
  parentPort.postMessage({
    error: {
      name: error.name || "Error",
      code: error.code || "ERR_ANALYSIS",
      message: error instanceof RangeError ? "Analysis could not allocate memory within the available resources" : error.message || String(error)
    }
  });
}
/*! Bundled license information:

xmlchars/xml/1.0/ed5.js:
  (**
   * Character classes and associated utilities for the 5th edition of XML 1.0.
   *
   * @author Louis-Dominique Dubeau
   * @license MIT
   * @copyright Louis-Dominique Dubeau
   *)

xmlchars/xml/1.1/ed2.js:
  (**
   * Character classes and associated utilities for the 2nd edition of XML 1.1.
   *
   * @author Louis-Dominique Dubeau
   * @license MIT
   * @copyright Louis-Dominique Dubeau
   *)

xmlchars/xmlns/1.0/ed3.js:
  (**
   * Character class utilities for XML NS 1.0 edition 3.
   *
   * @author Louis-Dominique Dubeau
   * @license MIT
   * @copyright Louis-Dominique Dubeau
   *)
*/
