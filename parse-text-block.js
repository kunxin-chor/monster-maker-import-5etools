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
            ac: lines[4].split()[2], // "Armor Class X"
            from: [
            "natural armor"
            ]
        }
    ]

    // HIT POINTS
    let hp = lines[5].split()[2]
    monster.hp = {
        'average': hp, //"Hit Points X"
        'formula': Math.ceil(hp/6)
    }

    // SPEEDS
    let speeds = {}
    let speedChunks = lines[6].split(',');
    for (let speedString of speedChunks) {
         let speedType = speedString.split()[0];
         let speedUnit = speedString.split()[1]; // eg. speed 40ft
         speedString = speedString.subsring(0, speedString.length-2); // remove the 'ft'
         if (speedType=='Speed') {
             speedType='walk'
         }
         speed[speedType] = speedString;
    }


    monster.speed = {
        "walk": speedString
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