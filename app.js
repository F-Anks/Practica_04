    import express from 'express';
    import session from 'express-session';
    import { v4 as uuidv4 } from 'uuid';
    import os from 'os';
    import moment from 'moment-timezone';

    import connectDB from './db.js';
    import Session from './Session.js';

    connectDB(); 
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
            
            const hours = Math.floor(duration.asHours());
            const minutes = duration.minutes();
            const seconds = duration.seconds();
            
            return {
                hours,
                minutes,
                seconds,
                formatted: `${hours}h ${minutes}m ${seconds}s`
            };
        } catch (error) {
            console.error('Error calculating inactivity time:', error);
            return {
                hours: 0,
                minutes: 0,
                seconds: 0,
                formatted: '0h 0m 0s'
            };
        }
    };
    
    const getServerInfo = () => {
        const networkInterfaces = os.networkInterfaces();
        let serverInfo = {
            ip: null,
            mac: null
        };
    
        for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            for (const iface of interfaces) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    serverInfo.ip = iface.address;
                    serverInfo.mac = iface.mac;
                    return serverInfo;
                }
            }
        }
        return serverInfo;
    };
    
    const getClientInfo = (req) => {
        let clientIP = req.ip || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress || 
                      req.connection.socket?.remoteAddress || 
                      '0.0.0.0';
        
        if (clientIP === '::1' || clientIP === '127.0.0.1') {
            const serverInfo = getServerInfo();
            clientIP = serverInfo.ip;
        }
        
        if (clientIP.includes('::ffff:')) {
            clientIP = clientIP.replace('::ffff:', '');
        }
    
        return {
            ip: clientIP
        };
    };
    
    app.get('/welcome', (req, res) => {
        return res.status(200).json({
            message: "Welcome to the HTTP Sessions API", 
            author: "Francisco Garcia Garcia",
        });
    });
    
    
    app.post('/login', async (req, res) => {
        try {
            const {email, nickname, macAddress} = req.body;
    
            if(!email || !nickname || !macAddress) {
                return res.status(400).json({message: "Required fields are expected"});
            }
    
            const serverInfo = getServerInfo();
            const clientInfo = getClientInfo(req);
    
            const currentTime = getCDMXDateTime();
            const sessionData = {
                sessionId: uuidv4(),
                email,
                nickname,
                clientInfo: {
                    ip: clientInfo.ip,
                    mac: macAddress
                },
                serverInfo: {
                    ip: serverInfo.ip,
                    mac: serverInfo.mac
                },
                status: 'Activa',
                lastAccesed: currentTime,
                createdAt: currentTime,
                updatedAt: currentTime
            };
    
            const session = new Session(sessionData);
            await session.save();
    
            req.session.userSession = session;
    
            res.status(200).json({
                message: "You have successfully logged in",
                sessionId: session.sessionId
            });
        } catch (error) {
            console.error('Error in login:', error);
            res.status(500).json({message: "Error creating session", error: error.message});
        }
    });
    
    
    
    
    app.post("/logout", async (req, res) => {
        try {
            const { sessionId } = req.body;
    
            const session = await Session.findOne({ sessionId });
            if (!session) {
                return res.status(404).json({message: "No active session found."});
            }
    
            session.status = 'Inactiva';
            session.lastAccesed = getCDMXDateTime();
            await session.save();
    
            req.session.destroy((err) => {
                if(err) {
                    return res.status(500).json({message: 'Error logging out'});
                }
                res.status(200).json({message: "Logout successful"});
            });
        } catch (error) {
            console.error('Error en logout:', error);
            res.status(500).json({message: "Error logging out", error: error.message});
        }
    });
    
    
    
    app.put("/update", async (req, res) => {
        try {
            const { sessionId } = req.body;
    
            const session = await Session.findOne({ sessionId });
            if (!session) {
                return res.status(404).json({message: "There is no active session"});
            }
    
            const serverInfo = getServerInfo();
            const clientInfo = getClientInfo(req);
            const currentTime = getCDMXDateTime();
    
            session.clientInfo.ip = clientInfo.ip;
            session.serverInfo = {
                ip: serverInfo.ip,
                mac: serverInfo.mac
            };
            session.status = 'Activa';
            session.lastAccesed = currentTime;
    
            await session.save();
    
            return res.status(200).json({
                message: "Session updated successfully",
                session
            });
        } catch (error) {
            console.error('Error en update:', error);
            res.status(500).json({message: "Error updating session", error: error.message});
        }
    });
    
    
    
    app.get("/status", async (req, res) => {
        try {
            const { sessionId } = req.body;
            
            if (!sessionId) {
                return res.status(400).json({message: "A sessionId is required"});
            }
            
            const session = await Session.findOne({ sessionId });
            if (!session) {
                return res.status(404).json({message: "Session not found"});
            }
    
            const serverInfo = getServerInfo();
            const clientInfo = getClientInfo(req);
            
            const inactivityTime = calculateInactivityTime(session.lastAccesed);
    
            const sessionResponse = {
                ...session.toObject(),
                serverInfo,
                clientInfo: {
                    ...session.clientInfo,
                    ip: clientInfo.ip
                },
                inactivityTime
            };
            
            return res.status(200).json({
                message: "Sesión found",
                session: sessionResponse
            });
        } catch (error) {
            console.error('Error in status:', error);
            res.status(500).json({message: "Error getting session state", error: error.message});
        }
    });
    
    
    
    app.get("/allSessions", async (req, res) => {
        try {
            const allSessions = await Session.find({});
    
            if (allSessions.length === 0) {
                return res.status(200).json({
                    message: "There are no sessions recorded",
                    count: 0,
                    sessions: []
                });
            }
    
            const serverInfo = getServerInfo();
            const clientInfo = getClientInfo(req);
    
            const updatedSessions = allSessions.map(session => {
                const sessionObj = session.toObject();
                return {
                    ...sessionObj,
                    clientInfo: {
                        ...sessionObj.clientInfo,
                        ip: clientInfo.ip
                    },
                    serverInfo: serverInfo,
                    inactivityTime: calculateInactivityTime(session.lastAccesed)
                };
            });
    
            return res.status(200).json({
                message: "Sessions found",
                count: updatedSessions.length,
                sessions: updatedSessions
            });
        } catch (error) {
            console.error('Error in allSessions:', error);
            res.status(500).json({message: "Error listing sessions", error: error.message});
        }
    });
    
    
    
    app.get("/allCurrentSessions", async (req, res) => {
        try {
            const activeSessions = await Session.find({ status: 'Active' });
    
            if (activeSessions.length === 0) {
                return res.status(200).json({
                    message: "There are no active sessions",
                    count: 0,
                    sessions: []
                });
            }
    
            const serverInfo = getServerInfo();
            const clientInfo = getClientInfo(req);
    
            const updatedSessions = activeSessions.map(session => {
                const sessionObj = session.toObject();
                return {
                    ...sessionObj,
                    clientInfo: {
                        ...sessionObj.clientInfo,
                        ip: clientInfo.ip
                    },
                    serverInfo: serverInfo,
                    inactivityTime: calculateInactivityTime(session.lastAccesed)
                };
            });
    
            return res.status(200).json({
                message: "Active sessions found",
                count: updatedSessions.length,
                sessions: updatedSessions
            });
        } catch (error) {
            console.error('Error in allCurrentSessions:', error);
            res.status(500).json({message: "Error listing active sessions", error: error.message});
        }
    });
    
    app.delete("/deleteAllSessions", async (req, res) => {
        try {
            await Session.deleteMany({});
            return res.status(200).json({
                message: "Todas las sesiones han sido eliminadas correctamente"
            });
        } catch (error) {
            console.error('All sessions have been deleted successfully:', error);
            res.status(500).json({message: "Error deleting sessions", error: error.message});
        }
    });
    
    
    
    app.listen(PORT, () => {
        console.log(`Servidor iniciado en http://localhost:${PORT}`);

    });
    
    
    export default app;