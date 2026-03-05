import { Router } from "express";
import AuthMiddleware from "../middleware/auth.js";
import { listSites, createSite, updateContractValue, updateSite, saveBudgetAllocation, getBudgetAllocation, deleteSite } from "../controllers/SiteController.js";


const siteRouter = Router();

siteRouter.use(AuthMiddleware);


siteRouter.get("/", listSites);
siteRouter.post("/", createSite);
// Admin: update contract value
siteRouter.put("/:siteId/contract-value", updateContractValue);
// Admin: update site details
siteRouter.put("/:siteId", updateSite);
// Budget allocation endpoints
siteRouter.get("/:siteId/budget-allocation", getBudgetAllocation);
siteRouter.post("/:siteId/budget-allocation", saveBudgetAllocation);
siteRouter.delete("/:siteId", deleteSite);

export default siteRouter;
