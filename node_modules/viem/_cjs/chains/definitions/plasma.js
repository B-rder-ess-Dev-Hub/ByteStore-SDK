"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plasma = void 0;
const defineChain_js_1 = require("../../utils/chain/defineChain.js");
exports.plasma = (0, defineChain_js_1.defineChain)({
    id: 9745,
    name: 'Plasma',
    nativeCurrency: {
        name: 'Plasma',
        symbol: 'XPL',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.plasma.to'],
        },
    },
    blockExplorers: {
        default: {
            name: 'PlasmaScan',
            url: 'https://plasmascan.to',
        },
    },
});
//# sourceMappingURL=plasma.js.map