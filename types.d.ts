declare var DOMLiner: any;
declare var table: HTMLTableElement;

interface Region extends Duration {
  title: string;
}

interface Duration {
  start: string;
  end: string;
}

interface Schema {
  japan: Region;
  korea: Region | null;
}
