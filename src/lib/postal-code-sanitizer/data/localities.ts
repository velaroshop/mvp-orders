/**
 * Lista de localități per județ
 * 
 * Structură: Map<județ, localități[]>
 * 
 * TODO: Actualizează cu datele complete din PDF când le vei procesa
 * Pentru moment, am adăugat localitățile principale pentru fiecare județ
 */

export const LOCALITIES_BY_COUNTY: Record<string, string[]> = {
  "Alba": [
    "Alba Iulia",
    "Aiud",
    "Blaj",
    "Sebeș",
    "Cugir",
    "Ocna Mureș",
    "Teiuș",
    "Zlatna",
  ],
  "Arad": [
    "Arad",
    "Chișineu-Criș",
    "Curtici",
    "Ineu",
    "Lipova",
    "Nădlac",
    "Pâncota",
    "Pecica",
    "Sântana",
    "Șeitin",
  ],
  "Argeș": [
    "Pitești",
    "Câmpulung",
    "Curtea de Argeș",
    "Mioveni",
    "Ștefănești",
    "Topoloveni",
  ],
  "Bacău": [
    "Bacău",
    "Moinești",
    "Onești",
    "Buhuși",
    "Comănești",
    "Dărmănești",
    "Târgu Ocna",
  ],
  "Bihor": [
    "Oradea",
    "Beiuș",
    "Marghita",
    "Salonta",
    "Ștei",
    "Valea lui Mihai",
    "Aleșd",
    "Nucet",
  ],
  "Bistrița-Năsăud": [
    "Bistrița",
    "Beclean",
    "Năsăud",
    "Sângeorz-Băi",
  ],
  "Botoșani": [
    "Botoșani",
    "Dorohoi",
    "Săveni",
    "Flămânzi",
    "Darabani",
  ],
  "Brașov": [
    "Brașov",
    "Făgăraș",
    "Săcele",
    "Codlea",
    "Râșnov",
    "Zărnești",
    "Victoria",
    "Predeal",
  ],
  "Brăila": [
    "Brăila",
    "Ianca",
    "Însurăței",
    "Făurei",
  ],
  "București": [
    "București",
    "Sector 1",
    "Sector 2",
    "Sector 3",
    "Sector 4",
    "Sector 5",
    "Sector 6",
  ],
  "Buzău": [
    "Buzău",
    "Râmnicu Sărat",
    "Nehoiu",
    "Pogoanele",
    "Pătârlagele",
  ],
  "Caraș-Severin": [
    "Reșița",
    "Caransebeș",
    "Moldova Nouă",
    "Oravița",
    "Anina",
    "Băile Herculane",
  ],
  "Călărași": [
    "Călărași",
    "Oltenița",
    "Budești",
    "Fundulea",
    "Lehliu Gară",
  ],
  "Cluj": [
    "Cluj-Napoca",
    "Turda",
    "Dej",
    "Câmpia Turzii",
    "Gherla",
    "Huedin",
    "Beclean",
  ],
  "Constanța": [
    "Constanța",
    "Mangalia",
    "Medgidia",
    "Cernavodă",
    "Năvodari",
    "Ovidiu",
    "Techirghiol",
  ],
  "Covasna": [
    "Sfântu Gheorghe",
    "Târgu Secuiesc",
    "Covasna",
    "Baraolt",
    "Întorsura Buzăului",
  ],
  "Dâmbovița": [
    "Târgoviște",
    "Moreni",
    "Pucioasa",
    "Găești",
    "Fieni",
    "Răcari",
  ],
  "Dolj": [
    "Craiova",
    "Băilești",
    "Calafat",
    "Filiași",
    "Dăbuleni",
    "Segarcea",
  ],
  "Galați": [
    "Galați",
    "Tecuci",
    "Târgu Bujor",
    "Berești",
  ],
  "Giurgiu": [
    "Giurgiu",
    "Bolintin-Vale",
    "Mihăilești",
  ],
  "Gorj": [
    "Târgu Jiu",
    "Motru",
    "Rovinari",
    "Bumbești-Jiu",
    "Tismana",
  ],
  "Harghita": [
    "Miercurea Ciuc",
    "Odorheiu Secuiesc",
    "Gheorgheni",
    "Toplița",
    "Cristuru Secuiesc",
    "Băile Tușnad",
  ],
  "Hunedoara": [
    "Deva",
    "Hunedoara",
    "Petroșani",
    "Lupeni",
    "Orăștie",
    "Brad",
    "Vulcan",
  ],
  "Ialomița": [
    "Slobozia",
    "Fetești",
    "Urziceni",
    "Țăndărei",
    "Amara",
  ],
  "Iași": [
    "Iași",
    "Pașcani",
    "Târgu Frumos",
    "Hârlău",
    "Podu Iloaiei",
    "Tomești",
  ],
  "Ilfov": [
    "Buftea",
    "Voluntari",
    "Pantelimon",
    "Chitila",
    "Măgurele",
    "Otopeni",
    "Bragadiru",
  ],
  "Maramureș": [
    "Baia Mare",
    "Sighetu Marmației",
    "Borșa",
    "Cavnic",
    "Târgu Lăpuș",
    "Vișeu de Sus",
  ],
  "Mehedinți": [
    "Drobeta-Turnu Severin",
    "Orșova",
    "Strehaia",
    "Vânju Mare",
  ],
  "Mureș": [
    "Târgu Mureș",
    "Reghin",
    "Sighișoara",
    "Târnăveni",
    "Ludus",
    "Sovata",
  ],
  "Neamț": [
    "Piatra Neamț",
    "Roman",
    "Târgu Neamț",
    "Bicaz",
    "Roznov",
  ],
  "Olt": [
    "Slatina",
    "Caracal",
    "Corabia",
    "Balș",
    "Drăgănești-Olt",
  ],
  "Prahova": [
    "Ploiești",
    "Câmpina",
    "Băicoi",
    "Breaza",
    "Bușteni",
    "Sinaia",
    "Azuga",
  ],
  "Sălaj": [
    "Zalău",
    "Jibou",
    "Șimleu Silvaniei",
    "Cehu Silvaniei",
  ],
  "Satu Mare": [
    "Satu Mare",
    "Carei",
    "Negrești-Oaș",
    "Tășnad",
    "Livada",
  ],
  "Sibiu": [
    "Sibiu",
    "Mediaș",
    "Cisnădie",
    "Avrig",
    "Agnita",
    "Dumbrăveni",
  ],
  "Suceava": [
    "Suceava",
    "Fălticeni",
    "Rădăuți",
    "Câmpulung Moldovenesc",
    "Vatra Dornei",
    "Gura Humorului",
  ],
  "Teleorman": [
    "Alexandria",
    "Roșiorii de Vede",
    "Turnu Măgurele",
    "Zimnicea",
  ],
  "Timiș": [
    "Timișoara",
    "Lugoj",
    "Sânnicolau Mare",
    "Jimbolia",
    "Reșița",
    "Făget",
  ],
  "Tulcea": [
    "Tulcea",
    "Babadag",
    "Isaccea",
    "Măcin",
    "Sulina",
  ],
  "Vâlcea": [
    "Râmnicu Vâlcea",
    "Drăgășani",
    "Băbeni",
    "Băile Govora",
    "Bălcești",
    "Berbești",
    "Brezoi",
    "Călimănești",
    "Horezu",
    "Ocnele Mari",
  ],
  "Vaslui": [
    "Vaslui",
    "Bârlad",
    "Huși",
    "Negrești",
    "Murgeni",
  ],
  "Vrancea": [
    "Focșani",
    "Adjud",
    "Mărășești",
    "Odobești",
    "Panciu",
  ],
};

/**
 * Obține lista de localități pentru un județ dat
 */
export function getLocalitiesForCounty(county: string): string[] {
  return LOCALITIES_BY_COUNTY[county] || [];
}

/**
 * Obține toate localitățile (pentru căutare globală dacă județul nu e cunoscut)
 */
export function getAllLocalities(): string[] {
  return Object.values(LOCALITIES_BY_COUNTY).flat();
}

/**
 * Verifică dacă o localitate există într-un județ
 */
export function isLocalityInCounty(locality: string, county: string): boolean {
  const localities = getLocalitiesForCounty(county);
  return localities.some(loc => 
    loc.toLowerCase().trim() === locality.toLowerCase().trim()
  );
}
