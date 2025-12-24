const LEVELS = [
	{
		name: "Level 01",
		mini: 70,
		board: 
			"HAAI" +
			"HAAI" +
			"NBBO" +
			"JPQK" +
			"J@@K"
	},
	{
		name: "Level 02",
		mini: 12,
		board: 
			"HNBB" +
			"HOIJ" +
			"AAIJ" +
			"AACC" +
			"PQ@@"
	},
	{
		name: "Level 03",
		mini: 36,
		board: 
			"BBCC" +
			"HAAI" +
			"HAAI" +
			"NOPQ" +
			"@DD@"
	},
	{
		name: "Level 04",
		mini: 68,
		board: 
			"NBBO" +
			"HAAI" +
			"HAAI" +
			"PCCQ" +
			"@DD@"
	},
	{
		name: "Level 05",
		mini: 39,
		board: 
			"HNIO" +
			"HPIQ" +
			"BBAA" +
			"CCAA" +
			"DD@@"
	},
	{
		name: "Level 06",
		mini: 77,
		board: 
			"HAAI" +
			"HAAI" +
			"NOBB" +
			"JPQK" +
			"J@@K"
	},	
	{
		name: "Level 07",
		mini: 26,
		board: 
			"AABB" +
			"AAHI" +
			"NOHI" +
			"JPQK" +
			"J@@K"
	},	
	{
		name: "Level 08",
		mini: 81,
		board: 
			"HAAI" +
			"HAAI" +
			"JBBK" +
			"JNOK" +
			"P@@Q"
	},	
	{
		name: "Level 09",
		mini: 53,
		board: 
			"HIAA" +
			"HIAA" +
			"NOPQ" +
			"JBBK" +
			"J@@K"
	},	
	{
		name: "Level 10",
		mini: 37,
		board: 
			"BBHI" +
			"AAHI" +
			"AAJK" +
			"NOJK" +
			"P@@Q"
	},	
	{
		name: "Level 11",
		mini: 28,
		board: 
			"HINO" +
			"HIAA" +
			"PJAA" +
			"KJBB" +
			"K@@Q"
	},		
	{
		name: "Level 12",
		mini: 11,
		board: 
			"HINO" +
			"HIJK" +
			"AAJK" +
			"AABB" +
			"P@@Q"
	},
	{
		name: "Level 13",
		mini: 7,
		board: 
			"HIJK" +
			"HIJK" +
			"NOAA" +
			"BBAA" +
			"P@@Q"
	},	
	{
		name: "Level 14",
		mini: 59,
		board: 
			"HNAA" +
			"HIAA" +
			"OIJP" +
			"Q@JK" +
			"BB@K"
	},	
	{
		name: "Level 15",
		mini: 61,
		board: 
			"NHAA" +
			"IHAA" +
			"IBBJ" +
			"OPKJ" +
			"@@KQ"
	},	
	{
		name: "Level 16",
		mini: 68,
		board: 
			"NOAA" +
			"HIAA" +
			"HIBB" +
			"PQJK" +
			"@@JK"
	},		
	{
		name: "Level 17",
		mini: 60,
		board: 
			"HAAI" +
			"HAAI" +
			"NJKO" +
			"PJKQ" +
			"@BB@"
	},
	{
		name: "Level 18",
		mini: 32,
		board: 
			"NAAO" +
			"HAAI" +
			"HPQI" +
			"JBBK" +
			"J@@K"
	},
	{
		name: "Level 19",
		mini: 29,
		board: 
			"@@AA" +
			"BBAA" +
			"NHOI" +
			"JHKI" +
			"JPKQ"
	},	
	{
		name: "Level 20",
		mini: 40,
		board: 
			"H@@N" +
			"HIOJ" +
			"PIKJ" +
			"AAKQ" +
			"AABB"
	},
	{
		name: "Level 21",
		mini: 82,
		board: 
			"HAAI" +
			"HAAI" +
			"BBNJ" +
			"OCCJ" +
			"P@@Q"
	},	
	{
		name: "Level 22",
		mini: 23,
		board: 
			"NOAA" +
			"BBAA" +
			"CCDD" +
			"EEFF" +
			"P@@Q"
	},	
	{
		name: "Level 23",
		mini: 30,
		board: 
			"AABB" +
			"AACC" +
			"DDNO" +
			"EEPH" +
			"Q@@H"
	},	
	{
		name: "Level 24",
		mini: 102,
		board: 
			"HAAI" +
			"HAAI" +
			"NBBO" +
			"PCCQ" +
			"@DD@"
	},	
	{
		name: "Level 25",
		mini: 42,
		board: 
			"AABB" +
			"AAHN" +
			"IJHO" +
			"IJPQ" +
			"@CC@"
	},	
	{
		name: "Level 26",
		mini: 30,
		board: 
			"NOHI" +
			"BBHI" +
			"AAPQ" +
			"AACC" +
			"DD@@"
	},	
	{
		name: "Level 27",
		mini: 126,
		board: 
			"NOAA" +
			"HPAA" +
			"HIBB" +
			"JIQ@" +
			"JCC@"
	},	
	{
		name: "Level 28",
		mini: 93,
		board: 
			"AAHI" +
			"AAHI" +
			"BBNO" +
			"PCCJ" +
			"Q@@J"
	},	
	{
		name: "Level 29",
		mini: 103,
		board: 
			"NOHI" +
			"@JHI" +
			"PJQ@" +
			"AABB" +
			"AACC"
	},	
	{
		name: "Level 30",
		mini: 43,
		board: 
			"BBCC" +
			"NAAO" +
			"@AA@" +
			"HPQI" +
			"HDDI"
	},	
	{
		name: "Level 31",
		mini: 120,
		board: 
			"NAAO" +
			"HAAI" +
			"HBBI" +
			"PCCQ" +
			"@DD@"
	},	
	{
		name: "Level 32",
		mini: 58,
		board: 
			"N@AA" +
			"HOAA" +
			"HIP@" +
			"JIQK" +
			"JBBK"
	},	
	{
		name: "Level 33",
		mini: 33,
		board: 
			"BBCC" +
			"NOPQ" +
			"AAHI" +
			"AAHI" +
			"DD@@"
	},	
	{
		name: "Level 34",
		mini: 69,
		board: 
			"AAHI" +
			"AAHI" +
			"BBJK" +
			"@@JK" +
			"NOPQ"
	},	
	{
		name: "Level 35",
		mini: 115,
		board: 
			"HNAA" +
			"HIAA" +
			"OI@P" +
			"JQBB" +
			"J@CC"
	},	
	{
		name: "Level 36",
		mini: 124,
		board: 
			"NAAO" +
			"HAAP" +
			"HBBQ" +
			"CCI@" +
			"DDI@"
	},	
	{
		name: "Level 37",
		mini: 31,
		board: 
			"AABB" +
			"AACC" +
			"DDNH" +
			"EEOH" +
			"PQ@@"
	},	
	{
		name: "Level 38",
		mini: 79,
		board: 
			"NAAH" +
			"OAAH" +
			"BBCC" +
			"DDEE" +
			"P@@Q"
	},	
	{
		name: "Level 39",
		mini: 30,
		board: 
			"BBAA" +
			"CCAA" +
			"NHDD" +
			"OHEE" +
			"P@@Q"
	},	
	{
		name: "Level 40",
		mini: 30,
		board: 
			"BBCC" +
			"HAAN" +
			"HAAO" +
			"DDEE" +
			"P@@Q"
	},	
	{
		name: "Level 41",
		mini: 62,
		board: 
			"HAAN" +
			"HAAO" +
			"IBBP" +
			"IJKQ" +
			"@JK@"
	},	
	{
		name: "Level 42",
		mini: 57,
		board: 
			"HIAA" +
			"HIAA" +
			"JKNO" +
			"JKBB" +
			"P@@Q"
	},	
	{
		name: "Level 43",
		mini: 43,
		board: 
			"NOHI" +
			"AAHI" +
			"AAJK" +
			"PQJK" +
			"BB@@"
	},	
	{
		name: "Level 44",
		mini: 6,
		board: 
			"HNO@" +
			"HPQ@" +
			"BBCC" +
			"IJAA" +
			"IJAA"
	},	
	{
		name: "Level 45",
		mini: 29,
		board: 
			"AABB" +
			"AACC" +
			"DDEE" +
			"H@NO" +
			"H@PQ"
	},	
	{
		name: "Level 46",
		mini: 107,
		board: 
			"@HAA" +
			"NHAA" +
			"BBOP" +
			"@CCI" +
			"QDDI"
	},	
	{
		name: "Level 47",
		mini: 46,
		board: 
			"NAAH" +
			"OAAH" +
			"IBBJ" +
			"IK@J" +
			"PK@Q"
	},	
	{
		name: "Level 48",
		mini: 38,
		board: 
			"BBCC" +
			"HAAI" +
			"HAAI" +
			"NDDO" +
			"@PQ@"
	},	
	{
		name: "Level 49",
		mini: 20,
		board: 
			"NOHI" +
			"PQHI" +
			"BB@@" +
			"AAJK" +
			"AAJK"
	},	
	{
		name: "Level 50",
		mini: 99,
		board: 
			"@@NO" +
			"PHIJ" +
			"QHIJ" +
			"AABB" +
			"AACC"
	},	
	{
		name: "Level 51",
		mini: 65,
		board: 
			"AAHI" +
			"AAHI" +
			"BBCC" +
			"NDDO" +
			"P@@Q"
	},	
	{
		name: "Level 52",
		mini: 105,
		board: 
			"HAAN" +
			"HAAO" +
			"IBB@" +
			"IJPQ" +
			"@JCC"
	},	
	{
		name: "Level 53",
		mini: 124,
		board: 
			"AANO" +
			"AAPH" +
			"BB@H" +
			"Q@IJ" +
			"CCIJ"
	},	
	{
		name: "Level 54",
		mini: 23,
		board: 
			"BBAA" +
			"NOAA" +
			"@@PQ" +
			"HIJK" +
			"HIJK"
	},	
	{
		name: "Level 55",
		mini: 58,
		board: 
			"@AAH" +
			"IAAH" +
			"INOJ" +
			"KPQJ" +
			"KBB@"
	},	
	{
		name: "Level 56",
		mini: 86,
		board: 
			"AAHI" +
			"AAHI" +
			"BBCC" +
			"NOJP" +
			"@@JQ"
	},	
	{
		name: "Level 57",
		mini: 110,
		board: 
			"NO@H" +
			"AAIH" +
			"AAIJ" +
			"BBPJ" +
			"QCC@"
	},	
	{
		name: "Level 58",
		mini: 29,
		board: 
			"N@BB" +
			"HIAA" +
			"HIAA" +
			"@JKO" +
			"PJKQ"
	},	
	{
		name: "Level 59",
		mini: 77,
		board: 
			"HIAA" +
			"HIAA" +
			"BBNJ" +
			"OPQJ" +
			"CC@@"
	},	
	{
		name: "Level 60",
		mini: 131,
		board: 
			"AANH" +
			"AA@H" +
			"O@BB" +
			"PICC" +
			"QIDD"
	}
];
