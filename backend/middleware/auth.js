import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

const AuthMiddleware = async (req, res, next) => {
    try {
        // Support token from Authorization header or `token` query param (for direct download links)
        let token = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ message: "Unauthorized, token missing" });
        }
        const decode = jwt.verify(token, process.env.JWT_SECRET || "development-secret");

        // Check if token was issued before server restart (instance ID mismatch)
        const currentInstanceId = process.env.SERVER_INSTANCE_ID;
        if (currentInstanceId && decode.instanceId !== currentInstanceId) {
            return res.status(401).json({ 
                message: "Session expired. Please login again.",
                code: "SESSION_EXPIRED"
            });
        }

        const user = await User.findById(decode.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found or has been deleted" });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("AuthMiddleware error", error);
        return res.status(401).json({
            message: "Unauthorized, invalid or expired token",
        });
    }
}
export default AuthMiddleware;