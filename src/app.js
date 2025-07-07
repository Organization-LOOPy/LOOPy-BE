import express from 'express';
import { responseHandler } from "./middlewares/responseHandler.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setupSwagger } from "./config/swagger.js";
setupSwagger(app);  

const app = express();

app.use(express.json());

app.get('/', (req, res) => res.send('루피 백엔드 작동 중!'));

app.use(responseHandler);

export default app;

app.use(errorHandler);