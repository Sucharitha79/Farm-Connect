import { badRequest } from './errors.js';
import { requireAvailableDates } from './validation.js';

export const getBookingDates = (bookingDate, duration, rateType) => {
  const date = typeof bookingDate === 'string' ? bookingDate : '';
  const [validatedDate] = requireAvailableDates([date]);
  const maxDuration = rateType === 'hourly' ? 24 : 30;
  if (!Number.isInteger(duration) || duration < 1 || duration > maxDuration) {
    throw badRequest(`duration must be a whole number between 1 and ${maxDuration} ${rateType === 'hourly' ? 'hours' : 'days'}.`);
  }

  const dates = [];
  const current = new Date(`${validatedDate}T00:00:00Z`);
  const dayCount = rateType === 'daily' ? duration : 1;
  for (let offset = 0; offset < dayCount; offset += 1) {
    const requested = new Date(current);
    requested.setUTCDate(current.getUTCDate() + offset);
    dates.push(requested.toISOString().slice(0, 10));
  }
  return dates;
};

export const getDatesForBooking = (booking, fallbackRateType = 'daily') =>
  getBookingDates(
    booking.bookingDate,
    booking.duration || 1,
    booking.rateType || fallbackRateType
  );

export const bookingDatesOverlap = (first, second) => {
  const firstDates = getDatesForBooking(first);
  const secondDates = getDatesForBooking(second);
  return firstDates.some((date) => secondDates.includes(date));
};
