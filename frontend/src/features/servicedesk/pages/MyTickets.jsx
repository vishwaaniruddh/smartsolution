import Tickets from './Tickets';

// MyTickets is just Tickets filtered to the current user
export default function MyTickets() {
  return <Tickets myTicketsOnly={true} />;
}
