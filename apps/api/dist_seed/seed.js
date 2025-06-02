"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var crypto = __importStar(require("crypto"));
console.log("SEED SCRIPT DATABASE_URL:", process.env.DATABASE_URL);
var prisma = new client_1.PrismaClient();
// Simple password hashing function that doesn't require native modules
function hashPassword(password) {
    // Using SHA-256 for a simple hash - NOT secure for production but works for demo
    return crypto.createHash('sha256').update(password).digest('hex');
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminPassword, superUser, demoCompany, adminPassword2, adminUser, demoWheel, slotData, _i, slotData_1, slot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adminPassword = hashPassword('superadmin123');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'super@iziwheel.com' },
                            update: {},
                            create: {
                                email: 'super@iziwheel.com',
                                password: adminPassword,
                                role: client_1.Role.SUPER,
                            },
                        })];
                case 1:
                    superUser = _a.sent();
                    console.log('Created SUPER user:', superUser.email);
                    return [4 /*yield*/, prisma.company.upsert({
                            where: { id: 'demo-company-id' },
                            update: {},
                            create: {
                                id: 'demo-company-id',
                                name: 'Demo Company',
                                plan: client_1.Plan.PREMIUM,
                                maxWheels: 3,
                            },
                        })];
                case 2:
                    demoCompany = _a.sent();
                    console.log('Created demo company:', demoCompany.name);
                    adminPassword2 = hashPassword('admin123');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@demo.com' },
                            update: {},
                            create: {
                                email: 'admin@demo.com',
                                password: adminPassword2,
                                role: client_1.Role.ADMIN,
                                companyId: demoCompany.id,
                            },
                        })];
                case 3:
                    adminUser = _a.sent();
                    console.log('Created ADMIN user for demo company:', adminUser.email);
                    return [4 /*yield*/, prisma.wheel.upsert({
                            where: { id: 'demo-wheel-id' },
                            update: {},
                            create: {
                                id: 'demo-wheel-id',
                                name: 'Demo Wheel',
                                companyId: demoCompany.id,
                                mode: client_1.WheelMode.RANDOM_WIN,
                                isActive: true,
                                formSchema: {
                                    fields: [
                                        { name: 'fullName', label: 'Full Name', type: 'text', required: true },
                                        { name: 'email', label: 'Email', type: 'email', required: true },
                                        { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
                                        { name: 'consent', label: 'I agree to receive marketing communications', type: 'checkbox', required: true },
                                    ],
                                },
                            },
                        })];
                case 4:
                    demoWheel = _a.sent();
                    console.log('Created demo wheel:', demoWheel.name);
                    slotData = [
                        { label: 'Win $50 Gift Card', probability: 15, prizeCode: 'GC50' },
                        { label: 'Win $100 Gift Card', probability: 5, prizeCode: 'GC100' },
                        { label: 'Free Product Sample', probability: 20, prizeCode: 'SAMPLE' },
                        { label: '10% Discount Code', probability: 20, prizeCode: 'DISC10' },
                        { label: '15% Discount Code', probability: 15, prizeCode: 'DISC15' },
                        { label: '20% Discount Code', probability: 10, prizeCode: 'DISC20' },
                        { label: 'Free Shipping Code', probability: 10, prizeCode: 'SHIP' },
                        { label: 'Premium Membership', probability: 5, prizeCode: 'PREMIUM' },
                    ];
                    _i = 0, slotData_1 = slotData;
                    _a.label = 5;
                case 5:
                    if (!(_i < slotData_1.length)) return [3 /*break*/, 8];
                    slot = slotData_1[_i];
                    return [4 /*yield*/, prisma.slot.upsert({
                            where: {
                                id: "demo-slot-".concat(slot.prizeCode),
                            },
                            update: {},
                            create: {
                                id: "demo-slot-".concat(slot.prizeCode),
                                wheelId: demoWheel.id,
                                label: slot.label,
                                prizeCode: slot.prizeCode,
                            },
                        })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log('Created 8 slots for demo wheel');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
