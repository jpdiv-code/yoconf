'use strict';

const fs = require('fs');
const dotenv = require('dotenv');
const yaml = require('yaml');

module.exports = class YOConf {
    /**
     * Create YOConf instance.
     * @param {Absolute path to the configuration file with the .yaml extension} file 
     */
    constructor(file) {
        this.loaded = false;
        this.file = file;
    }
    
    /**
     * Synchronous load configuration
     */
    load() {
        if (this.loaded) {
            return this;
        }
        dotenv.config();
        const configurations = yaml.parse(fs.readFileSync(this.file).toString());
        const profile = process.env.NODE_ENV || 'dev';
        const defaultConfig = configurations['default'];
        const profileConfig = configurations[profile];
        const argv = process.argv.slice(2);
        const env = process.env;
        this.dict = Object.create(null);
        const buildDict = (value, path) => {
            path = path || [];
            if (typeof value === 'object') {
                for (let key in value) {
                    path.push(key);
                    buildDict(value[key], path);
                    path.pop();
                }
            } else {
                this.dict[path.join('.')] = value;
            }
        };
        buildDict(defaultConfig);
        buildDict(profileConfig);
        for (let key in env) {
            this.dict[key] = env[key];
        }
        for (let arg of argv) {
            if (arg.startsWith('--')) {
                const parts = arg.split('=');
                const key = parts.shift().slice(2);
                let value;
                if (parts.length > 0) {
                    value = parts.join('=');
                } else {
                    value = 'true';
                }
                this.dict[key] = value;
            }
        }
        this.obj = Object.create(null);
        for (let key in this.dict) {
            const path = key.split('.');
            let cur = this.obj;
            let next;
            while (path.length > 1) {
                const part = path.shift();
                next = cur[part];
                if (next) {
                    const type = typeof next;
                    if (type !== 'object') {
                        next = new Object(null);
                        cur[part] = next;
                    }
                } else {
                    next = new Object(null);
                    cur[part] = next;
                }
                cur = next;
            }
            let value = this.dict[key];
            try {
                value = JSON.parse(value);
            } catch { }
            cur[path[0]] = value;
        }
        this.loaded = true;
        return this;
    }

    /**
     * Get value by path
     * @param {Value path} path 
     */
    get(path = '') {
        let cur = this.obj;
        const parts = path.split('.').filter(part => part.length > 0);
        if (parts.length === 0) {
            return cur;
        }
        while (parts.length > 1) {
            cur = cur[parts.shift()];
            if (typeof cur != 'object') {
                return undefined;
            }
        }
        return cur[parts[0]];
    }
};