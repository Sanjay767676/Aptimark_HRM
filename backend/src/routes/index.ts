import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import paymentsRouter from "./payments";
import offerLettersRouter from "./offer-letters";
import certificatesRouter from "./certificates";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import expensesRouter from "./expenses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(paymentsRouter);
router.use(offerLettersRouter);
router.use(certificatesRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(expensesRouter);

export default router;
