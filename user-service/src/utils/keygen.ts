import crypto from 'crypto';

function mix(base1: Buffer, base2: Buffer): Buffer {
    const mixed = Buffer.alloc(Math.max(base1.length, base2.length));
    for (let i = 0; i < mixed.length; i++) {
        mixed[i] = base1[i % base1.length] ^ base2[i % base2.length];
    }
    return mixed;
}

function getSharedNoise(): number {
    const now = new Date().getTime();
    const noiseWindow = Math.floor(now / 10000);

    const seed = noiseWindow * 12345;
    return seed % 3000;
}

export const generateKey = () => {
    const BASE_SECRET = process.env.JWT_SECRET as string;
    const MY_CAT_NAME = process.env.CAT_NAME as string;
    const CHANGE_TIME = 60 * 5; // 5min
    const NOISE = getSharedNoise();
    const currentTime = new Date().getTime() + NOISE;

    const timeWindow = Math.floor(currentTime / (CHANGE_TIME * 1000));
    const timeSalt = crypto
        .createHash('sha256')
        .update(timeWindow.toString())
        .digest('hex');

    const mixedSecret = mix(
        Buffer.from(new TextEncoder().encode(BASE_SECRET)),
        Buffer.from(new TextEncoder().encode(MY_CAT_NAME))
    );

    const finalKey = crypto
        .createHash('sha256')
        .update(mixedSecret.toString('hex') + ':' + timeSalt)
        .digest('hex');

    return `MRS{${finalKey}}`;
};
