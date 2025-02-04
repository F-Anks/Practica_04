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


// Zona horaria por defecto
const TIMEZONE = "America/Mexico_City"; // Ajusta según tu región


// Sesiones almacenadas en memoria
const sessions = {};

// Tiempo máximo de inactividad en milisegundos (2 minutos)
const MAX_INACTIVITY_TIME = 2 * 60 * 1000;

// Intervalo para limpiar sesiones inactivas (cada minuto)
setInterval(() => {
    const now = moment().tz(TIMEZONE);
    for (const sessionId in sessions) {
        const session = sessions[sessionId];
        const lastAccessedAt = moment(session.lastAccessedAt);
        const inactivityDuration = now.diff(lastAccessedAt);

        if (inactivityDuration > MAX_INACTIVITY_TIME) {
            console.log(`Eliminando sesión por inactividad: ${sessionId}`);
            delete sessions[sessionId];
        }
    }
}, 60 * 1000); // Revisión cada minuto


// Función de utilidad para obtener la IP del cliente
const getClientIp = (req) => {
    let ip = req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket?.remoteAddress;

    // Si la IP tiene el prefijo "::ffff:", eliminarlo para obtener solo IPv4
    if (ip && ip.startsWith("::ffff:")) {
        ip = ip.substring(7); // Elimina "::ffff:"
    }

    return ip;
};


const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return { serverIp: iface.address, serverMac: iface.mac };
            }
        }
    }
    return { serverIp: "0.0.0.0", serverMac: "00:00:00:00:00:00" }; // Fallback en caso de error
};

// Login Endpoint
app.post("/login", (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: "Falta algún campo." });
    }

    const sessionId = uuidv4();
    const now = moment().tz(TIMEZONE);
    const clientIp = getClientIp(req); // Obtener la IP del cliente

    sessions[sessionId] = {
        sessionId,
        email,
        nickname,
        macAddress,
        ip: clientIp, // Guardar la IP del cliente
        createdAt: now.format("YYYY-MM-DD HH:mm:ss"),
        lastAccessedAt: now,
    };

    res.status(200).json({
        message: "Inicio de sesión exitoso.",
        sessionId,
    });
});

// Logout Endpoint
app.post("/logout", (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({ message: "No se ha encontrado una sesión activa." });
    }

    delete sessions[sessionId];
    req.session?.destroy((err) => {
        if (err) {
            return res.status(500).send("Error al cerrar la sesión.");
        }
    });
    res.status(200).json({ message: "Logout exitoso." });
});


// Actualización de la sesión
app.post("/update", (req, res) => {
    const { sessionId, email, nickname } = req.body;

    if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({ message: "No existe una sesión activa." });
    }

    const now = moment().tz(TIMEZONE);
    if (email) sessions[sessionId].email = email;
    if (nickname) sessions[sessionId].nickname = nickname;
    sessions[sessionId].lastAccessedAt = now;

    res.status(200).json({
        message: "Sesión actualizada correctamente.",
        session: {
            sessionId,
            email: sessions[sessionId].email,
            nickname: sessions[sessionId].nickname,
            createdAt: sessions[sessionId].createdAt,
            lastAccessedAt: sessions[sessionId].lastAccessedAt.format("YYYY-MM-DD HH:mm:ss"),
        },
    });
});

// Estado de la sesión
app.get("/status", (req, res) => {
    const sessionId = req.query.sessionId;

    // Obtener la IP y MAC del servidor
    const { serverIp, serverMac } = getServerNetworkInfo();

    if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({ message: "No hay sesión activa." });
    }

    const now = moment().tz(TIMEZONE);
    const session = sessions[sessionId];
    const lastAccessedAt = moment(session.lastAccessedAt);
    const inactivityDuration = moment.duration(now.diff(lastAccessedAt));
    const sessionDuration = moment.duration(now.diff(moment(session.createdAt)));

    res.status(200).json({
        message: "Sesión activa.",
        session: {
            ...session,
            serverIp,
            serverMac, // MAC del servidor
            inactivity: `${inactivityDuration.minutes()} minutos y ${inactivityDuration.seconds()} segundos`,
            totalDuration: `${sessionDuration.hours()} horas, ${sessionDuration.minutes()} minutos y ${sessionDuration.seconds()} segundos`,
        },
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});