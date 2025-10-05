"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.encryptPassword = void 0;
const bcrypt = require("bcrypt");
const encryptPassword = async (plaintextPassword) => await bcrypt.hash(plaintextPassword, 10);
exports.encryptPassword = encryptPassword;
const comparePassword = async (plaintextPassword, hash) => await bcrypt.compare(plaintextPassword, hash);
exports.comparePassword = comparePassword;
//# sourceMappingURL=password.utils.js.map