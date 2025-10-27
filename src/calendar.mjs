import ical from 'ical';

/**
 * Creates an ICAL instance from the input URL
 * @param {string} url
 */
export const getEventsFromCalendar = async url => {
  const response = await fetch(url);
  const text = await response.text();

  return Object.values(ical.parseICS(text));
};

/**
 * @param {Date} now
 */
const getWeekBounds = (now = new Date()) => {
  const startDate = now.getUTCDate() - now.getUTCDay();

  const start = new Date(now.setUTCDate(startDate));
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(now.setUTCDate(startDate + 7));
  end.setUTCHours(0, 0, 0, 0);

  return [start, end];
};

/**
 * Finds the next meeting event in any iCal feed for the current week
 * @param {ical.CalendarComponent[]} allEvents - The events
 * @param {import('./types').MeetingConfig} meetingConfig - Meeting configuration object
 * @returns {Promise<Date>} The date of the next meeting
 */
export const findNextMeetingDate = async (allEvents, { properties }) => {
  const [weekStart, weekEnd] = getWeekBounds();

  const filteredEvents = allEvents.filter(
    event =>
      // The event must be recurring
      event.rrule &&
      // The event must match our filter
      (event.summary || event.description)?.includes(properties.CALENDAR_FILTER)
  );

  for (const event of filteredEvents) {
    // Get all recurrences in our timeframe
    event.rrule.options.tzid = event.tzid;
    const duringOurTimeframe = event.rrule.between(weekStart, weekEnd);

    if (duringOurTimeframe.length > 0) {
      return duringOurTimeframe[0];
    }
  }

  throw new Error(
    `No meeting found for ${properties.GROUP_NAME || 'this group'} ` +
      `in the current week (${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}). ` +
      `This is expected for bi-weekly meetings or meetings that don't occur every week.`
  );
};
