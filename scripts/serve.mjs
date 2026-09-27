import { createStudioServer } from './api-server.mjs';
const port=Number(process.env.PORT??4354);
createStudioServer().listen(port,'127.0.0.1',()=>console.log(`Shapeshift Studio: http://127.0.0.1:${port}/ (live API: /api/sessions)`));
