declare var DOMLiner: any;
declare var table: HTMLTableElement;

interface Region extends Duration {
  title: string;
  noticeId?: string;
}

interface Duration {
  start: string;
  end: string;
}

interface Meta {
  attribute?: "pure" | "cool" | "happy" | "powerful",
  dreamFestival?: {
    linkId?: string
  }
}

interface Schema {
  linkId: string | null;
  meta: Meta | null;
  type: "normal" | "challenge" | "versus" | "try" | "mission" | "team",
  region: {
    japan: Region;
    taiwan: Region | null;
    korea: Region | null;
    global: Region | null;
    china: Region | null;
  }
}

interface DateDiffs {
  durationBase: number;
  durationTarget: number;
  diff: number;
}

interface Document {
  getElementById<T extends Node>(name: string): T;
}

type IteratorParameter<T> = T extends Iterable<infer X> ? X : null;

interface ImportMeta {
  url: string;
}
