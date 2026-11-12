import mongoose from 'mongoose';

const { Schema } = mongoose;

const entityOptions = { versionKey: false, minimize: false };
const idField = { type: String, required: true, unique: true, index: true };

const userSchema = new Schema({
  id: idField,
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobileNumber: {
    type: String,
    required() { return this.role !== 'admin'; }
  },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true },
  location: { type: String, default: '' },
  farmName: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  wishlistProductIds: { type: [String], default: [] },
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
}, entityOptions);

const pendingRegistrationSchema = new Schema({
  id: idField,
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobileNumber: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true },
  location: { type: String, default: '' },
  createdAt: { type: String, required: true },
  lastOtpSentAt: { type: Number, default: null }
}, entityOptions);

const authChallengeSchema = new Schema({
  id: idField,
  email: { type: String, required: true },
  purpose: { type: String, enum: ['registration'], required: true },
  salt: { type: String, required: true },
  otpHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Number, required: true }
}, entityOptions);
authChallengeSchema.index({ email: 1, purpose: 1 }, { unique: true });
authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const otpCooldownSchema = new Schema({
  id: idField,
  email: { type: String, required: true },
  purpose: { type: String, enum: ['registration'], required: true },
  lastSentAt: { type: Number, default: 0 },
  inFlight: { type: Boolean, default: false }
}, entityOptions);
otpCooldownSchema.index({ email: 1, purpose: 1 }, { unique: true });

const workerSchema = new Schema({
  id: idField,
  userId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  location: { type: String, required: true },
  skills: { type: [String], required: true },
  wageType: { type: String, enum: ['daily', 'hourly'], required: true },
  wageAmount: { type: Number, required: true },
  experienceYears: { type: Number, required: true },
  availableDates: { type: [String], required: true },
  isAvailable: { type: Boolean, default: true },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  createdAt: { type: String, required: true },
  updatedAt: String
}, entityOptions);

const bookingSchema = new Schema({
  id: idField,
  farmerId: { type: String, required: true },
  providerId: { type: String, required: true },
  serviceType: { type: String, enum: ['WORKER', 'EQUIPMENT'], required: true },
  serviceId: { type: String, required: true },
  workType: { type: String, default: '' },
  description: { type: String, default: '' },
  bookingDate: { type: String, required: true },
  bookingEndDate: { type: String, required: true },
  duration: { type: Number, required: true },
  rateType: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  location: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, required: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: String
}, entityOptions);

const equipmentSchema = new Schema({
  id: idField,
  ownerId: { type: String, required: true },
  equipmentName: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  rentalRateType: { type: String, enum: ['hourly', 'daily'], required: true },
  rentalPrice: { type: Number, required: true },
  location: { type: String, required: true },
  availableDates: { type: [String], required: true },
  createdAt: { type: String, required: true },
  updatedAt: String
}, entityOptions);

const produceSchema = new Schema({
  id: idField,
  farmerId: { type: String, required: true },
  produceName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  expectedPrice: { type: Number, required: true },
  location: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  status: { type: String, required: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: String
}, entityOptions);

const bidSchema = new Schema({
  id: idField,
  produceId: { type: String, required: true, index: true },
  buyerId: { type: String, required: true },
  bidAmount: { type: Number, required: true },
  quantity: { type: Number, required: true },
  message: { type: String, default: '' },
  status: { type: String, required: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: String
}, entityOptions);

const orderSchema = new Schema({
  id: idField,
  orderNumber: { type: String, required: true, unique: true },
  bidId: { type: String, required: true },
  produceId: { type: String, required: true, index: true },
  farmerId: { type: String, required: true },
  buyerId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, required: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, entityOptions);

const createModel = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

export const models = {
  users: createModel('User', userSchema),
  pendingRegistrations: createModel('PendingRegistration', pendingRegistrationSchema),
  authChallenges: createModel('AuthChallenge', authChallengeSchema),
  otpCooldowns: createModel('OtpCooldown', otpCooldownSchema),
  workers: createModel('Worker', workerSchema),
  bookings: createModel('Booking', bookingSchema),
  equipment: createModel('Equipment', equipmentSchema),
  produceListings: createModel('ProduceListing', produceSchema),
  bids: createModel('Bid', bidSchema),
  orders: createModel('Order', orderSchema)
};
