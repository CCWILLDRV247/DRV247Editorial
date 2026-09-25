export type VehicleModel = {
  name: string;
  aliases: string[];
  generations?: string[];
  variants?: string[];
  /** Generation codes that uniquely identify this model (964 → 911). */
  generationImpliesModel?: boolean;
};

export type VehicleRecord = {
  make: string;
  aliases: string[];
  models: VehicleModel[];
};

/** Append a marque here to extract, pick, and filter it. The list is not closed. */
function marque(make: string, aliases: string[], models: VehicleModel[] = []): VehicleRecord {
  return { make, aliases, models };
}

export const VEHICLE_CATALOG: VehicleRecord[] = [
  marque("Porsche", ["porsche"], [
    {
      name: "911",
      aliases: ["911", "nine eleven", "carrera", "gt2", "gt3", "gt3 rs", "911 gt3"],
      generations: ["964", "993", "996", "997", "991", "992"],
      variants: ["Carrera 2", "Carrera 4", "C2"],
      generationImpliesModel: true,
    },
    { name: "356", aliases: ["356"] },
    { name: "Cayman", aliases: ["cayman", "718 cayman"] },
    { name: "Boxster", aliases: ["boxster", "718 boxster"] },
    { name: "Cayenne", aliases: ["cayenne"] },
    { name: "Macan", aliases: ["macan"] },
    { name: "Taycan", aliases: ["taycan"] },
  ]),
  marque("Ferrari", ["ferrari"], [
    {
      name: "F355",
      aliases: ["f355", "f 355", "355", "ferrari 355", "355 gtb", "355 berlinetta"],
      generations: ["F355"],
      variants: ["GTB"],
    },
    {
      name: "348",
      aliases: ["348", "ferrari 348", "348 tb", "348 ts", "348 spider"],
      generations: ["348"],
      variants: ["tb", "ts", "Spider", "Challenge", "GT Competizione"],
    },
    { name: "F40", aliases: ["f40"] },
    { name: "F50", aliases: ["f50"] },
    { name: "360", aliases: ["360 modena", "360"] },
    { name: "458", aliases: ["458"] },
    { name: "Testarossa", aliases: ["testarossa"] },
  ]),
  marque("BMW", ["bmw"], [
    {
      name: "M3",
      aliases: ["m3"],
      generations: ["E30", "E36", "E46", "E92", "F80", "G80"],
    },
    { name: "M5", aliases: ["m5"] },
    { name: "2002", aliases: ["2002"] },
  ]),
  marque("Mercedes-Benz", ["mercedes-benz", "mercedes", "amg"], [
    { name: "300SL", aliases: ["300sl", "300 sl"] },
    { name: "G-Wagen", aliases: ["g-wagen", "gwagen", "g-class"] },
  ]),
  marque("Audi", ["audi"], [
    { name: "Quattro", aliases: ["ur-quattro", "ur quattro", "sport quattro"] },
    { name: "R8", aliases: ["r8"] },
    { name: "TT", aliases: ["audi tt", "tt rs"] },
    { name: "RS2", aliases: ["rs2"] },
  ]),
  marque("Volkswagen", ["volkswagen", "vw"], [
    { name: "Golf", aliases: ["golf", "golf gti", "golf r"] },
    { name: "Beetle", aliases: ["beetle", "karmann"] },
    { name: "Type 2", aliases: ["type 2", "type2", "microbus", "split-screen"] },
  ]),
  marque("Ford", ["ford"], [
    { name: "Mustang", aliases: ["mustang"] },
    { name: "GT40", aliases: ["gt40", "gt 40"] },
    { name: "Escort", aliases: ["escort rs", "rs escort", "ford escort", "mk2 escort"] },
    { name: "Capri", aliases: ["capri"] },
    { name: "Sierra", aliases: ["sierra cosworth", "rs500"] },
    { name: "GT", aliases: ["ford gt"] },
  ]),
  marque("Jaguar", ["jaguar"], [
    { name: "E-Type", aliases: ["e-type", "etype", "e type"] },
    { name: "XK", aliases: ["xk", "xk120", "xk140"] },
  ]),
  marque("Land Rover", ["land rover", "land-rover"], [
    { name: "Defender", aliases: ["defender"] },
    { name: "Discovery", aliases: ["discovery"] },
    { name: "Range Rover", aliases: ["range rover"] },
  ]),
  marque("Aston Martin", ["aston martin", "aston"], [
    { name: "DB5", aliases: ["db5"] },
    { name: "DB11", aliases: ["db11"] },
    { name: "Vantage", aliases: ["vantage"] },
  ]),
  marque("Bentley", ["bentley"], [
    { name: "Continental", aliases: ["continental gt", "bentley continental"] },
    { name: "Blower", aliases: ["blower"] },
    { name: "Bentayga", aliases: ["bentayga"] },
  ]),
  marque("Lotus", ["lotus"], [
    { name: "Elise", aliases: ["elise"] },
    { name: "Cortina", aliases: ["cortina"] },
    {
      name: "Emira",
      aliases: ["emira"],
      variants: ["First Edition", "i4", "V6", "SE"],
    },
  ]),
  marque("McLaren", ["mclaren"], [
    { name: "F1", aliases: ["mclaren f1"] },
    { name: "P1", aliases: ["p1"] },
    { name: "720S", aliases: ["720s"] },
  ]),
  marque("Lamborghini", ["lamborghini"], [
    { name: "Miura", aliases: ["miura"] },
    { name: "Countach", aliases: ["countach"] },
    { name: "Huracan", aliases: ["huracan", "huracán"] },
  ]),
  marque("Maserati", ["maserati"], [
    { name: "Ghibli", aliases: ["ghibli"] },
    { name: "Bora", aliases: ["bora"] },
    { name: "MC20", aliases: ["mc20"] },
    { name: "GranTurismo", aliases: ["granturismo", "gran turismo"] },
  ]),
  marque("Alfa Romeo", ["alfa romeo", "alfa"], [
    { name: "Giulia", aliases: ["giulia"] },
    { name: "Spider", aliases: ["spider"] },
  ]),
  marque("Fiat", ["fiat"], [
    { name: "500", aliases: ["fiat 500", "cinquecento"] },
    { name: "124", aliases: ["124 spider", "fiat 124"] },
    { name: "X1/9", aliases: ["x1/9", "x19"] },
  ]),
  marque("Lancia", ["lancia"], [
    { name: "Stratos", aliases: ["stratos"] },
    { name: "Delta", aliases: ["delta integrale", "integrale"] },
    { name: "Fulvia", aliases: ["fulvia"] },
    { name: "Aurelia", aliases: ["aurelia"] },
  ]),
  marque("Volvo", ["volvo"], [
    { name: "P1800", aliases: ["p1800"] },
    { name: "240", aliases: ["volvo 240"] },
    { name: "850", aliases: ["850 t5", "850 r", "t5-r"] },
  ]),
  marque("Saab", ["saab"], [
    { name: "900", aliases: ["saab 900"] },
    { name: "99", aliases: ["saab 99"] },
    { name: "Sonett", aliases: ["sonett"] },
  ]),
  marque("Renault", ["renault"], [
    { name: "5", aliases: ["renault 5", "5 turbo"] },
    { name: "Clio", aliases: ["clio williams", "clio v6"] },
    { name: "4CV", aliases: ["4cv"] },
  ]),
  marque("Peugeot", ["peugeot"], [
    { name: "205", aliases: ["205 gti", "peugeot 205"] },
    { name: "405", aliases: ["405 t16"] },
    { name: "504", aliases: ["peugeot 504"] },
  ]),
  marque("Citroën", ["citroen", "citroën"], [
    { name: "DS", aliases: ["citroen ds", "citroën ds"] },
    { name: "2CV", aliases: ["2cv"] },
    { name: "SM", aliases: ["citroen sm", "citroën sm"] },
  ]),
  marque("Honda", ["honda"], [
    {
      name: "Civic",
      aliases: ["civic"],
      generations: ["EK9", "EP3", "FK8", "FL5"],
      variants: ["Type R"],
    },
    { name: "NSX", aliases: ["nsx"] },
    { name: "S2000", aliases: ["s2000"] },
    { name: "Integra", aliases: ["integra"], variants: ["Type R"] },
    { name: "CR-X", aliases: ["cr-x", "crx"] },
  ]),
  marque("Toyota", ["toyota"], [
    { name: "Supra", aliases: ["supra"] },
    { name: "2000GT", aliases: ["2000gt"] },
    { name: "AE86", aliases: ["ae86", "corolla gt"] },
    { name: "MR2", aliases: ["mr2"] },
    { name: "GT86", aliases: ["gt86", "gt 86"] },
    { name: "Land Cruiser", aliases: ["land cruiser"] },
  ]),
  marque("Nissan", ["nissan"], [
    { name: "Skyline", aliases: ["skyline"], generationImpliesModel: true, generations: ["R32", "R33", "R34"] },
    { name: "GT-R", aliases: ["gt-r", "nissan gtr"] },
    { name: "240Z", aliases: ["240z", "fairlady z"] },
    { name: "300ZX", aliases: ["300zx"] },
    {
      name: "240SX",
      aliases: ["240sx", "240 sx", "nissan 240sx"],
      generations: ["S13", "S14"],
      generationImpliesModel: true,
    },
    { name: "Silvia", aliases: ["silvia"], generations: ["S13", "S14", "S15"] },
    { name: "180SX", aliases: ["180sx"] },
    { name: "Figaro", aliases: ["figaro"] },
  ]),
  marque("Mazda", ["mazda"], [
    { name: "MX-5", aliases: ["mx-5", "mx5", "miata", "eunos"] },
    { name: "RX-7", aliases: ["rx-7", "rx7"] },
    { name: "RX-8", aliases: ["rx-8", "rx8"] },
  ]),
  marque("Subaru", ["subaru"], [
    { name: "Impreza", aliases: ["impreza"] },
    { name: "WRX", aliases: ["wrx"] },
    { name: "BRZ", aliases: ["brz"] },
    { name: "SVX", aliases: ["svx"] },
  ]),
  marque("Mini", ["mini cooper", "bmw mini", "mini"], [
    { name: "Cooper S", aliases: ["cooper s"] },
    { name: "Countryman", aliases: ["countryman"] },
  ]),
  marque("Rolls-Royce", ["rolls-royce", "rolls royce"], [
    { name: "Phantom", aliases: ["rolls-royce phantom", "rolls royce phantom"] },
    { name: "Silver Ghost", aliases: ["silver ghost"] },
    { name: "Corniche", aliases: ["corniche"] },
  ]),
  marque("Morgan", ["morgan"], [
    { name: "Plus 8", aliases: ["plus 8", "plus8"] },
    { name: "3 Wheeler", aliases: ["3 wheeler", "three wheeler"] },
    { name: "Aero", aliases: ["morgan aero"] },
  ]),
  marque("TVR", ["tvr"], [
    { name: "Griffith", aliases: ["griffith"] },
    { name: "Chimaera", aliases: ["chimaera"] },
    { name: "Cerbera", aliases: ["cerbera"] },
    { name: "Sagaris", aliases: ["sagaris"] },
    { name: "Tuscan", aliases: ["tvr tuscan"] },
  ]),
  marque("Caterham", ["caterham"], [
    { name: "Seven", aliases: ["caterham seven", "super seven"] },
  ]),
  marque("Alpine", ["renault alpine"], [
    { name: "A110", aliases: ["a110", "alpine a110"] },
    { name: "A310", aliases: ["a310", "alpine a310"] },
  ]),
  marque("Bugatti", ["bugatti"], [
    { name: "Veyron", aliases: ["veyron"] },
    { name: "Chiron", aliases: ["chiron"] },
    { name: "Type 35", aliases: ["type 35"] },
    { name: "EB110", aliases: ["eb110"] },
  ]),
  marque("Pagani", ["pagani"], [
    { name: "Zonda", aliases: ["zonda"] },
    { name: "Huayra", aliases: ["huayra"] },
    { name: "Utopia", aliases: ["pagani utopia"] },
  ]),
  marque("Koenigsegg", ["koenigsegg"], [
    { name: "Agera", aliases: ["agera"] },
    { name: "Jesko", aliases: ["jesko"] },
    { name: "Gemera", aliases: ["gemera"] },
    { name: "CCX", aliases: ["ccx"] },
  ]),
  marque("Alpina", ["alpina"], [
    { name: "B10", aliases: ["alpina b10"] },
    { name: "B3", aliases: ["alpina b3"] },
  ]),
  marque("Abarth", ["abarth"], [
    { name: "595", aliases: ["abarth 595"] },
    { name: "500", aliases: ["abarth 500"] },
  ]),
  marque("Cupra", ["cupra"], [
    { name: "Formentor", aliases: ["formentor"] },
    { name: "Born", aliases: ["cupra born"] },
  ]),
  marque("Skoda", ["skoda", "škoda"], [
    { name: "Octavia", aliases: ["octavia vrs", "skoda octavia"] },
    { name: "110R", aliases: ["110 r", "skoda 110"] },
  ]),
  marque("Opel", ["opel"], [
    { name: "Manta", aliases: ["manta"] },
    { name: "Calibra", aliases: ["calibra"] },
    { name: "GT", aliases: ["opel gt"] },
    { name: "Kadett", aliases: ["kadett"] },
  ]),
  marque("Vauxhall", ["vauxhall"], [
    { name: "Chevette", aliases: ["chevette"] },
    { name: "Astra", aliases: ["vauxhall astra"] },
    { name: "Lotus Carlton", aliases: ["lotus carlton"] },
  ]),
  marque("Mitsubishi", ["mitsubishi"], [
    { name: "Lancer Evolution", aliases: ["lancer evo", "lancer evolution", "mitsubishi evo"] },
    { name: "3000GT", aliases: ["3000gt"] },
    { name: "Starion", aliases: ["starion"] },
  ]),
  marque("Lexus", ["lexus"], [
    { name: "LFA", aliases: ["lfa"] },
    { name: "IS-F", aliases: ["is-f", "isf"] },
    { name: "LC", aliases: ["lexus lc"] },
  ]),
  marque("Datsun", ["datsun"], [
    { name: "240Z", aliases: ["datsun 240z"] },
    { name: "510", aliases: ["datsun 510"] },
  ]),
  marque("Triumph", ["triumph"], [
    { name: "TR6", aliases: ["tr6"] },
    { name: "TR4", aliases: ["tr4"] },
    { name: "Spitfire", aliases: ["triumph spitfire"] },
    { name: "Stag", aliases: ["triumph stag"] },
    { name: "Dolomite", aliases: ["dolomite sprint"] },
  ]),
  marque("MG", ["mg"], [
    { name: "MGB", aliases: ["mgb"] },
    { name: "MGA", aliases: ["mga"] },
    { name: "Midget", aliases: ["mg midget"] },
    { name: "TF", aliases: ["mg tf"] },
  ]),
  marque("Austin-Healey", ["austin-healey", "austin healey"], [
    { name: "3000", aliases: ["healey 3000", "big healey"] },
    { name: "Sprite", aliases: ["frogeye", "bugeye", "healey sprite"] },
  ]),
  marque("Jensen", ["jensen"], [
    { name: "Interceptor", aliases: ["interceptor"] },
    { name: "FF", aliases: ["jensen ff"] },
  ]),
  marque("De Tomaso", ["de tomaso", "detomaso"], [
    { name: "Pantera", aliases: ["pantera"] },
    { name: "Mangusta", aliases: ["mangusta"] },
  ]),
  marque("Bizzarrini", ["bizzarrini"], [
    { name: "5300 GT", aliases: ["5300 gt", "5300gt"] },
  ]),
  marque("Chevrolet", ["chevrolet", "chevy"], [
    { name: "Corvette", aliases: ["corvette", "stingray"] },
    { name: "Camaro", aliases: ["camaro"] },
    { name: "Bel Air", aliases: ["bel air", "belair"] },
  ]),
  marque("Dodge", ["dodge"], [
    { name: "Viper", aliases: ["viper"] },
    { name: "Challenger", aliases: ["dodge challenger"] },
    { name: "Charger", aliases: ["dodge charger"] },
  ]),
  marque("Tesla", ["tesla"], [
    { name: "Roadster", aliases: ["tesla roadster"] },
    { name: "Model S", aliases: ["model s plaid", "tesla model s"] },
    { name: "Cybertruck", aliases: ["cybertruck"] },
  ]),
  marque("Polestar", ["polestar"], [
    { name: "1", aliases: ["polestar 1"] },
    { name: "2", aliases: ["polestar 2"] },
  ]),
  marque("Maybach", ["maybach"], [
    { name: "57", aliases: ["maybach 57"] },
    { name: "Exelero", aliases: ["exelero"] },
  ]),
  marque("Jeep", ["jeep"], [
    { name: "Wrangler", aliases: ["wrangler"] },
    { name: "Cherokee", aliases: ["jeep cherokee"] },
  ]),
  marque("Hyundai", ["hyundai"], [
    { name: "Ioniq 5 N", aliases: ["ioniq 5 n", "ioniq5 n"] },
    { name: "Coupe", aliases: ["hyundai coupe"] },
  ]),
  marque("Kia", ["kia"], [
    { name: "Stinger", aliases: ["stinger"] },
    { name: "EV6", aliases: ["ev6"] },
  ]),
  marque("Ariel", ["ariel"], [
    { name: "Atom", aliases: ["ariel atom"] },
    { name: "Nomad", aliases: ["ariel nomad"] },
  ]),
  marque("AC", ["ac cars"], [
    { name: "Cobra", aliases: ["ac cobra"] },
    { name: "Ace", aliases: ["ac ace"] },
  ]),
  marque("Noble", ["noble"], [
    { name: "M12", aliases: ["noble m12"] },
    { name: "M600", aliases: ["m600"] },
  ]),
  marque("Ginetta", ["ginetta"], [
    { name: "G40", aliases: ["g40"] },
    { name: "G50", aliases: ["g50"] },
  ]),
  marque("Rimac", ["rimac"], [
    { name: "Nevera", aliases: ["nevera"] },
  ]),
  marque("DS", ["ds automobiles"], [
    { name: "DS 9", aliases: ["ds 9"] },
    { name: "DS 7", aliases: ["ds 7"] },
  ]),
  marque("Cadillac", ["cadillac"], [
    { name: "Eldorado", aliases: ["eldorado"] },
    { name: "CTS-V", aliases: ["cts-v", "ctsv"] },
  ]),
  marque("Suzuki", ["suzuki"], [
    { name: "Cappuccino", aliases: ["cappuccino"] },
    { name: "Jimny", aliases: ["jimny"] },
    { name: "Swift Sport", aliases: ["swift sport"] },
  ]),
  marque("Bristol", ["bristol cars"], [
    { name: "Fighter", aliases: ["bristol fighter"] },
    { name: "411", aliases: ["bristol 411"] },
  ]),
  marque("Alvis", ["alvis"], [
    { name: "TD21", aliases: ["td21"] },
    { name: "Speed 20", aliases: ["speed 20"] },
  ]),
  marque("Lister", ["lister"], [
    { name: "Knobbly", aliases: ["knobbly"] },
    { name: "Storm", aliases: ["lister storm"] },
  ]),
  marque("Radical", ["radical sportscars"], [
    { name: "SR3", aliases: ["radical sr3"] },
    { name: "SR8", aliases: ["radical sr8"] },
  ]),
  marque("Iso", ["iso rivolta", "iso grifo"], [
    { name: "Grifo", aliases: ["grifo"] },
    { name: "Rivolta", aliases: ["iso rivolta"] },
  ]),
  marque("Delage", ["delage"], [
    { name: "D8", aliases: ["delage d8"] },
  ]),
  marque("Facel Vega", ["facel vega"], [
    { name: "HK500", aliases: ["hk500", "hk 500"] },
    { name: "Facel II", aliases: ["facel ii"] },
  ]),
  marque("Wiesmann", ["wiesmann"], [
    { name: "MF3", aliases: ["mf3"] },
    { name: "GT MF5", aliases: ["mf5"] },
  ]),
  marque("Apollo", ["apollo", "gumpert"], [
    { name: "IE", aliases: ["apollo ie"] },
    { name: "N", aliases: ["gumpert apollo"] },
  ]),
  marque("Spyker", ["spyker"], [
    { name: "C8", aliases: ["spyker c8"] },
  ]),
  marque("Donkervoort", ["donkervoort"], [
    { name: "D8", aliases: ["donkervoort d8"] },
  ]),
  marque("Ineos", ["ineos"], [
    { name: "Grenadier", aliases: ["grenadier"] },
  ]),
  marque("Pininfarina", ["pininfarina"], [
    { name: "Battista", aliases: ["battista"] },
  ]),
  marque("Tatra", ["tatra"], [
    { name: "T87", aliases: ["t87"] },
    { name: "T603", aliases: ["t603"] },
  ]),
  marque("Marcos", ["marcos"], [
    { name: "Mantula", aliases: ["mantula"] },
  ]),
  marque("Westfield", ["westfield"], [
    { name: "SEi", aliases: ["westfield sei"] },
  ]),
  marque("Sunbeam", ["sunbeam"], [
    { name: "Tiger", aliases: ["sunbeam tiger"] },
    { name: "Alpine", aliases: ["sunbeam alpine"] },
  ]),
  marque("Rover", ["rover p6", "rover sd1", "rover p5"], [
    { name: "P6", aliases: ["rover p6"] },
    { name: "SD1", aliases: ["rover sd1"] },
    { name: "P5", aliases: ["rover p5"] },
  ]),
  marque("Brabus", ["brabus"]),
  marque("Ruf", ["ruf"], [
    { name: "CTR", aliases: ["ruf ctr", "yellowbird"] },
  ]),
  marque("Shelby", ["shelby"], [
    { name: "GT350", aliases: ["gt350"] },
    { name: "GT500", aliases: ["gt500"] },
    { name: "Cobra", aliases: ["shelby cobra"] },
  ]),
  marque("Chrysler", ["chrysler"], [
    { name: "300C", aliases: ["chrysler 300c"] },
    { name: "Crossfire", aliases: ["crossfire"] },
  ]),
  marque("Infiniti", ["infiniti"], [
    { name: "G35", aliases: ["g35"] },
    { name: "Q60", aliases: ["q60"] },
  ]),
  marque("Genesis", ["genesis g70", "genesis gv80"], [
    { name: "G70", aliases: ["genesis g70"] },
    { name: "GV80", aliases: ["gv80"] },
  ]),
  marque("Smart", ["smart fortwo", "smart roadster", "mcc smart"], [
    { name: "Fortwo", aliases: ["fortwo"] },
    { name: "Roadster", aliases: ["smart roadster"] },
  ]),
  marque("SEAT", ["seat leon", "seat ibiza", "seat ateca"], [
    { name: "Leon", aliases: ["seat leon"] },
    { name: "Ibiza", aliases: ["seat ibiza"] },
  ]),
  marque("Zenvo", ["zenvo"], [
    { name: "TSR-S", aliases: ["tsr-s"] },
    { name: "ST1", aliases: ["zenvo st1"] },
  ]),
  marque("Lagonda", ["lagonda"], [
    { name: "Taraf", aliases: ["taraf"] },
    { name: "Rapide", aliases: ["lagonda rapide"] },
  ]),
  marque("Matra", ["matra"], [
    { name: "Bagheera", aliases: ["bagheera"] },
    { name: "Murena", aliases: ["murena"] },
  ]),
  marque("Talbot", ["talbot"], [
    { name: "Sunbeam Lotus", aliases: ["talbot sunbeam", "sunbeam lotus"] },
  ]),
];

export const INTEREST_TAXONOMY = [
  "Classic",
  "Air-cooled",
  "Performance",
  "Sports Cars",
  "Supercars",
  "Modern Classics",
  "Modified",
  "Tuning",
  "JDM",
  "Euro",
  "American",
  "Motorsport",
  "Rally",
  "Drift",
  "Drag Racing",
  "Track",
  "Design",
  "Automotive Design",
  "Car Culture",
  "Road Trips",
  "Collector Cars",
  "Collecting",
  "Restoration",
  "Detailing",
  "Photography",
  "Events",
  "Engine Swaps",
] as const;

export const EDITORIAL_CATEGORIES = [
  "News",
  "Features",
  "Car Culture",
  "Classic",
  "Collector",
  "Performance",
  "Modified",
  "Motorsport",
  "Design",
  "Technology",
  "History",
  "People",
  "Interviews",
  "Events",
  "Road Trips",
  "Buying",
  "Market",
  "Restoration",
  "Engineering",
  "Lifestyle",
  "Photography",
  "Video",
] as const;

export type Interest = (typeof INTEREST_TAXONOMY)[number];
export type EditorialCategory = (typeof EDITORIAL_CATEGORIES)[number];

export const EDITORIAL_LOCATIONS = [
  "Goodwood",
  "Monza",
  "Le Mans",
  "Spa",
  "Nürburgring",
  "London",
  "Milan",
  "Paris",
  "Monaco",
  "Villa d'Este",
  "Retromobile",
  "Amelia Island",
  "Stelvio Pass",
  "United States",
  "United Kingdom",
  "Japan",
  "Italy",
  "Germany",
  "France",
  "Alps",
] as const;

export const CONTENT_TYPES = [
  "News",
  "Feature",
  "Build",
  "Review",
  "Technical",
  "Guide",
  "Interview",
  "Opinion",
  "History",
  "Event",
  "Road Trip",
  "Motorsport",
  "Video",
] as const;

export const SCENE_TAXONOMY = [
  "JDM",
  "VIP",
  "Stance",
  "Drift",
  "Drag",
  "Lowrider",
  "Euro",
  "Classic",
  "Air-cooled",
  "Hot Rod",
  "Restomod",
  "Street",
  "Tuning",
  "Underground",
] as const;

export const MOTORSPORT_SERIES = [
  "F1",
  "WRC",
  "GT",
  "Endurance",
  "Touring Cars",
  "Rallycross",
  "NASCAR",
  "Drag",
  "Drift",
] as const;

export type GeoKind = "country" | "region" | "city" | "circuit" | "event";

export const GEOGRAPHY_CATALOG: { name: string; aliases: string[]; kind: GeoKind }[] = [
  { name: "Goodwood", aliases: ["goodwood", "goodwood revival", "goodwood fos"], kind: "circuit" },
  { name: "Monza", aliases: ["monza"], kind: "circuit" },
  { name: "Le Mans", aliases: ["le mans", "lemans"], kind: "circuit" },
  { name: "Spa", aliases: ["spa-francorchamps", "spa francorchamps"], kind: "circuit" },
  { name: "Nürburgring", aliases: ["nurburgring", "nürburgring", "nordschleife"], kind: "circuit" },
  { name: "Stelvio Pass", aliases: ["stelvio"], kind: "region" },
  { name: "Alps", aliases: ["alps", "alpine pass"], kind: "region" },
  { name: "London", aliases: ["london"], kind: "city" },
  { name: "Milan", aliases: ["milan", "milano"], kind: "city" },
  { name: "Paris", aliases: ["paris"], kind: "city" },
  { name: "Monaco", aliases: ["monaco", "monte carlo"], kind: "city" },
  { name: "Villa d'Este", aliases: ["villa d'este", "villa deste"], kind: "event" },
  { name: "Retromobile", aliases: ["retromobile", "rétromobile"], kind: "event" },
  { name: "Amelia Island", aliases: ["amelia island"], kind: "event" },
  { name: "United States", aliases: ["united states", "usa", "u.s."], kind: "country" },
  { name: "United Kingdom", aliases: ["united kingdom", "great britain"], kind: "country" },
  { name: "Japan", aliases: ["japan"], kind: "country" },
  { name: "Italy", aliases: ["italy"], kind: "country" },
  { name: "Germany", aliases: ["germany"], kind: "country" },
  { name: "France", aliases: ["france"], kind: "country" },
];

export type ContentType = (typeof CONTENT_TYPES)[number];
export type Scene = (typeof SCENE_TAXONOMY)[number];
export type MotorsportSeries = (typeof MOTORSPORT_SERIES)[number];
