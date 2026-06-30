"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Enable CORS for frontend cross-origin requests
app.use((0, cors_1.default)({
    origin: '*', // For hackathon purposes, allow all origins
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express_1.default.json());
// Load endpoints under /api
app.use('/api', documentRoutes_1.default);
// Catch-all 404 for undefined routes
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});
// Register global error handler middleware
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`[Conseal Backend] Running at http://localhost:${PORT}`);
});
exports.default = app;
