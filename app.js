import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: "P4-FGG#TirandoCodigoDSM-SesionesHTTP-VariablesDeSesion",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000 }, // 5 minutos
    })
);
// Ruta raíz
app.get("/welcome", (req, res) => {
    return res.status(200).json({
        message: "Bienvenido a la API control de sessiones",
        author: "Francisco Garcia Garcia",
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});