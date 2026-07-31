export const driverRouteListKey = (driverId: string) => `driver:route-list:${driverId}`;
export const driverRouteDetailKey = (eventId: string, driverId: string) =>
  `driver:route-detail:${eventId}:${driverId}`;
