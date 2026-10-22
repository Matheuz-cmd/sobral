export type Status = "active" | "archived";

export type Client = {
  id: string;
  name: string;
  status: Status;
  companies: Company[];
};

export type Company = {
  id: string;
  client_id: string;
  name: string;
  logo_url: string | null;
  color: string;
  status: Status;
};
