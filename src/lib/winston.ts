import winston from "winston"
//import path from "path"

// Set this to whatever, by default the path of the script.
//var logPath = process.cwd();

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.colorize(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    ]
});

export default logger;