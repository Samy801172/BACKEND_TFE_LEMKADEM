"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SayHelloException = void 0;
var config_1 = require("common/config");
var enum_1 = require("common/config/api/enum");
var SayHelloException = /** @class */ (function (_super) {
    __extends(SayHelloException, _super);
    function SayHelloException() {
        // Call the super constructor with the appropriate API code response and status code
        return _super.call(this, enum_1.ApiCodeResponse.TEST, 200) || this;
    }
    return SayHelloException;
}(config_1.ApiException));
exports.SayHelloException = SayHelloException;
