import express from 'express';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import moment from 'moment-timezone';

import './database.js';
import Session from './models/Session.js';

const sessions = new Map();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "P6-FGG#TirandoCodigoDSM-SesionesHTTP-Implementacion de la Persistencia de los datos de sesion en una Base de Datos NoRelacional.",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000 }
    })
);

const getCDMXDateTime = () => moment().tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss');

const calculateInactivityTime = (lastAccessed) => {
    try {
        const now = moment().tz('America/Mexico_City');
        const lastAccess = moment.tz(lastAccessed, 'DD-MM-YYYY HH:mm:ss', 'America/Mexico_City');
        const diffMs = now.diff(lastAccess);
        const duration = moment.duration(diffMs);

        return {
            hours: Math.floor(duration.asHours()),
            minutes: duration.minutes(),
            seconds: duration.seconds(),
            formatted: `${Math.floor(duration.asHours())}h ${duration.minutes()}m ${duration.seconds()}s`
        };
    } catch (error) {
        console.error('Error calculating inactivity time:', error);
        return { hours: 0, minutes: 0, seconds: 0, formatted: '0h 0m 0s' };
    }
};

const getServerInfo = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { ip: iface.address, mac: iface.mac };
            }
        }
    }
    return { ip: null, mac: null };
};

const getClientInfo = (req) => {
    let clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket?.remoteAddress || '0.0.0.0';
    if (clientIP.includes('::ffff:')) clientIP = clientIP.replace('::ffff:', '');
    return { ip: clientIP === '::1' || clientIP === '127.0.0.1' ? getServerInfo().ip : clientIP };
};

app.get('/welcome', (req, res) => {
    res.status(200).json({ message: "Welcome to API for Control  of Sesions", author: "Francisco Garcia Garcia" });
});

app.post('/login', async (req, res) => {
    try {
        const { email, nickname, macAddress } = req.body;
        if (!email || !nickname || !macAddress) return res.status(400).json({ message: "Required fields are expected" });

        const sessionData = {
            sessionId: uuidv4(),
            email,
            nickname,
            clientInfo: { ip: getClientInfo(req).ip, mac: macAddress },
            serverInfo: getServerInfo(),
            status: 'Activa',
            lastAccesed: getCDMXDateTime(),
            createdAt: getCDMXDateTime(),
            updatedAt: getCDMXDateTime()
        };

        const session = new Session(sessionData);
        await session.save();
        req.session.userSession = session;

        res.status(200).json({ message: "you are login successfully", sessionId: session.sessionId });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: "failed to login", error: error.message });
    }
});

app.post("/logout", async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ message: "No active session found." });

        session.status = 'Finished';
        session.lastAccesed = getCDMXDateTime();
        await session.save();

        req.session.destroy((err) => {
            if (err) return res.status(500).json({ message: 'Error to logout' });
            res.status(200).json({ message: "Logout successfully" });
        });
    } catch (error) {
        console.error('Error in logout:', error);
        res.status(500).json({ message: "Error to logout", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
    console.log(`Información del servidor:`, getServerInfo());
});

export default app;