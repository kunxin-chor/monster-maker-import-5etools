const sizeTable = {
    'Small':'S',
    'Huge':'H',
    'Medium':'M',
}

const alignmentTable = {
    'lawful':'L',
    'chaotic':'C',
    'good':'G',
    'evil':'E',
    'neutral':'N'
}

function readJSON() {
    let monster = JSON.parse($('#monster-maker'))
    return monster;
}

function convertSize(sizeString) {
    return sizeTable[sizeString];
}

function getAlignmentShortForm(alignment) {
    return alignmentTable[alignment];
}

function parseSpeed(speedLine) {
    let speeds = {}
    let speedChunks = speedLine.split(',');
    console.log(speedChunks);
    for (let speedString of speedChunks) {
         let speedType = speedString.trim().split(' ')[0].trim();
         let speedUnit = speedString.trim().split(' ')[1].trim(); // eg. speed 40ft

         if (speedType=='Speed') {
             speedType='walk'
         }
         speeds[speedType] = speedUnit;
    }
    return speeds;
}





function parseStat(statLine) 
{
    return statLine.trim().split(' ')[1];
}    

function parseSaves(line) {
    // get the actual throws:
    let throws = line.trim().split(' ')[1];

    // split throws by commna
    let throwChunks = throws.trim().split(', ');

    let saves = {};
    for (let c of throwChunks) {
        let stats = c.trim().split(' ')[0];
        let modifier = c.trim().split(' ')[1];
        for(let s of stats.split('/')) {
            saves[s] = modifier;
        }
    }
    return saves;
}

function parseStatBlock()
{
    let textBlock = $('#monster-maker').val();

    let monster = {

    }

    // split into lines
    let lines = textBlock.split('\n')
    lines = lines.filter(function(l){
        return l.length >0;
    }).map(function(l){
        return l.trim();
    })

    monster.name = lines[0];
   
    monster.source = "Giffyglpyh's Monster Maker";
   
    // SIZE, TYPE, TAG AND ALIGNMENT
    ({size, type, tag, alignment} = parseIdentifiers(lines[1]));
    monster.size = size;
    monster.type= type;
    monster.tag = tag;
    monster.alignment = alignment;
    
    // MONSTER AC
    monster.ac = [
        {
            ac: lines[4].split(' ')[2], // "Armor Class X"
            from: [
            "natural armor"
            ]
        }
    ]

    // HIT POINTS
    let hp = lines[5].split(' ')[2]
    monster.hp = {
        'average': hp, //"Hit Points X"
        'formula': Math.ceil(hp/6)
    }

    // SPEEDS
    monster.speed = parseSpeed(line[6])

    // STATS
    monster.stats = {
        str: parseStat(lines[7]),
        dex: parseStat(lines[8]),
        con: parseStat(lines[9]),
        int: parseStat(lines[10]),
        wis: parseStat(lines[11]),
        cha: parseStat(lines[12])
    }
    
    // SAVES
    monster.saves = {

    }
    
}

function parseIdentifiers(descriptor) {
    let chunks = descriptor.split(' ');
    console.log(chunks);
    return {
        size: convertSize(chunks[0]),
        type: {
            type:chunks[1],
            tags: [
                chunks[2].substring(1, chunks[2].length-2), // to remove the brackets and brackets,
            ]
        },
        alignment: [
             getAlignmentShortForm(chunks[3]),
             getAlignmentShortForm(chunks[4])
        ]
    }
}