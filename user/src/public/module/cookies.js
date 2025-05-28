class Cookies {
    constructor() {
        this.cookies = document.cookie;
    }

    get(name) {
        return this.cookies.split("; ").find(row => row.startsWith(`${name}=`))?.split("=")[1];
    }

    set(name, value, options) {
        let cookie = `${name}=${value}; path=/`;
        if (options.maxAge) cookie += `; max-age=${options.maxAge}`;
        if (options.httpOnly) cookie += "; httpOnly";
        if (options.secure) cookie += "; secure";
        if (options.sameSite) cookie += `; sameSite=${options.sameSite}`;
        document.cookie = cookie;
    }

    remove(name) {
        this.set(name, "", { maxAge: -1 });
    }

    getAll() {
        return this.cookies.split("; ").reduce((acc, row) => {
            const [name, value] = row.split("=");
            acc[name] = value;
            return acc;
        }, {});
    }
}

export default Cookies;
