import { randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export const generateOTP = () => String(randomInt(100000, 1000000));

export const hashOTP = async (otp) => {
  const salt = randomBytes(16);
  const hash = await scrypt(otp, salt, 64);
  return {
    salt: salt.toString('hex'),
    hash: hash.toString('hex')
  };
};

export const verifyOTP = async (otp, saltHex, hashHex) => {
  const salt = Buffer.from(saltHex, 'hex');
  const expectedHash = Buffer.from(hashHex, 'hex');
  const actualHash = await scrypt(otp, salt, expectedHash.length);
  return timingSafeEqual(actualHash, expectedHash);
};
