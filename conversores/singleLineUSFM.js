const fs = require('fs');
const readline = require('readline');

// Função para processar o arquivo
function processFile(inputFile, outputFile) {
    const inputStream = fs.createReadStream(inputFile);
    const outputStream = fs.createWriteStream(outputFile);
    const rl = readline.createInterface({
        input: inputStream,
        crlfDelay: Infinity
    });

    let currentVerse = '';
    const allowedMultiLineMarkers = ['\\c', '\\b', '\\m', '\\p', '\\q1', '\\q2', '\\mt1', '\\mt2', '\\id', '\\ide', '\\h', '\\toc1', '\\toc2', '\\toc3', '\\d' ];

    rl.on('line', (line) => {
        const trimmedLine = line.trim();

        // Verifica se a linha contém um marcador de verso (\v)
        if (trimmedLine.startsWith('\\v ')) {
            // Se houver um verso anterior, escreve-o no arquivo de saída
            if (currentVerse) {
                outputStream.write(currentVerse + '\n');
            }
            currentVerse = line.trim() + ' '; // Inicia um novo verso
        } else if (allowedMultiLineMarkers.some(marker => trimmedLine.startsWith(marker))) {
            // Para marcadores específicos, escreve na linha seguinte
            if (currentVerse) {
                outputStream.write(currentVerse + '\n');
                currentVerse = ''; // Limpa o verso atual
            }
            outputStream.write(line + '\n');
        } else {
            // Continua adicionando conteúdo à linha do verso atual
            currentVerse += line;
        }
    });

    rl.on('close', () => {
        // Escreve o último verso
        if (currentVerse) {
            outputStream.write(currentVerse + '\n');
        }
        outputStream.end();
        console.log('Arquivo processado com sucesso!');
    });
}

// Executa o script com os parâmetros do arquivo de entrada e saída
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (inputFile && outputFile) {
    processFile(inputFile, outputFile);
} else {
    console.log('Por favor, forneça o nome do arquivo de origem e destino.');
}
