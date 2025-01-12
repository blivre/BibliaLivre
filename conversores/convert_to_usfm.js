const fs = require('fs');
const path = require('path');

// Função para ler o arquivo de origem e converter para USFM
function convertToUSFM(inputFile, outputFile, translationFile = null) {
    // Lê o arquivo de origem
    const data = fs.readFileSync(inputFile, 'utf8');
    
    // Divide o conteúdo em linhas
    const lines = data.split('\n');
    
    // Array para armazenar o conteúdo convertido
    let usfmContent = [];
    let chapterAdded = false; // Para controle de adição de capítulos

    // Variáveis para armazenar dados temporários
    let bookTitle = '';
    let shortName = '';
    let abbreviation = '';
    let ubsCode = '';
    let currentChapter = ''; // Variável para armazenar o número do capítulo atual
    let currentVerse = '';   // Variável para armazenar o número do versículo atual
    let currentPsalmTitle = '' // Variável para armazenar o título descritivo do salmo
    let isCapturingMetadata = true;
    let currentFootnote = '';
    let isCapturingFootnote = false;
    let isCapturingFootnoteKey = false;
    let isCapturingAdditions = false;
    let isCapturingInlineReference = false;
    let isCapturingPsalmTitle = false;
    let currentKey = ''; // Variável para capturar keywords dentro de notas
    let translationName = ''; // Variável para o nome da tradução

    // Se o arquivo de tradução for fornecido, lê a primeira linha para translationName
    if (translationFile && fs.existsSync(translationFile)) {
        const translationData = fs.readFileSync(translationFile, 'utf8');
        const translationLines = translationData.split('\n');
        translationName = translationLines[0].trim();
    }

    // Processa cada linha do arquivo de origem
    lines.forEach((line, index) => {
        if (line.trimStart().startsWith('\\name-long')) {
            bookTitle = lines[index + 1].trim();
        } else if (line.startsWith('\\name-short')) {
            shortName = lines[index + 1].trim();
        } else if (line.startsWith('\\abbreviation')) {
            abbreviation = lines[index + 1].trim();
        } else if (line.startsWith('\\ubs-code')) {
            ubsCode = lines[index + 1].trim();
        } else if (line.startsWith('\\v')) {
            isCapturingMetadata = false;

            // Captura o número do capítulo e do versículo
            const referenceMatch = line.match(/\\v (\w+)\.(\d+)\.(\d+)/); // Ajusta regex para capturar livro, capítulo e versículo
            if (referenceMatch) {
                const chapter = referenceMatch[2];
                const verse = referenceMatch[3];
                
                // Adiciona o capítulo apenas uma vez
                if (!chapterAdded || currentChapter !== chapter) {
                    usfmContent.push(`\\c ${chapter}`);                    
                    if (currentPsalmTitle != '') {
                        usfmContent.push(currentPsalmTitle);
                        currentPsalmTitle = '';
                    }
                    usfmContent.push(`\\p`);
                    chapterAdded = true;
                    currentChapter = chapter;
                }

                // Captura o texto do versículo
                const verseText = line.substring(referenceMatch[0].length).trim();
                usfmContent.push(`\\v ${verse} ${verseText}`);
                currentVerse = verse;
            }
        } else if (line.startsWith('\\fn')) {
            isCapturingFootnote = true;
            currentFootnote = ''; // Inicia captura da nota de rodapé
            currentKey = ''; // Reseta a keyword
        } else if (isCapturingFootnote) {
            if (line.startsWith('\\key')) {
                isCapturingFootnoteKey = true;
                currentKey = lines[index + 1].trim(); // Captura o conteúdo de \key
            } else if (line.startsWith('\\*fn')) {
                // Adiciona nota de rodapé completa com a keyword, se existir
                if (currentKey) {
                    currentFootnote = `\\fk ${currentKey} \\ft ${currentFootnote}`;
                } else {
                    currentFootnote = `\\ft ${currentFootnote}`;
                }
                usfmContent.push(`\\f + \\fr ${currentChapter}.${currentVerse} ${currentFootnote.trim()} \\f*`);
                isCapturingFootnote = false;
            } else if (line.startsWith('\\*key')) { 
                isCapturingFootnoteKey = false;
            }
            else {
                if(!isCapturingFootnoteKey) {
                    // Continua capturando a nota de rodapé
                    currentFootnote += line.trim() + ' ';
                }                
            }
        } else if (line.startsWith('\\added')) {
            isCapturingAdditions = true;
            currentFootnote = ''; // Inicia captura da adição
        } else if (isCapturingAdditions) {
            if (line.startsWith('\\*added')) {
                // Adiciona adição completa
                usfmContent.push(`\\add ${currentFootnote.trim()} \\add*`);
                isCapturingAdditions = false;
            } else {
                // Continua capturando a adição
                currentFootnote += line.trim() + ' ';
            }
        } else if (line.startsWith('\\ref')) {
            isCapturingInlineReference = true;
            // Converte referências
            usfmContent.push(`\\rq ${lines[index + 1].trim()} \\rq*`);
        } else if (isCapturingInlineReference) {
            if (line.startsWith('\\*ref')) {
                isCapturingInlineReference = false;
            }
        } else if (line.startsWith('\\psalm-title')) {
            isCapturingPsalmTitle = true;
            // Converte título de Salmo
            currentPsalmTitle = `\\d ${lines[index + 1].trim()}`
        } else if (isCapturingPsalmTitle) {
            if (line.startsWith('\\*psalm-title')) {
                isCapturingPsalmTitle = false;
            }
        }
        else {
            if (!isCapturingMetadata) {
                usfmContent.push(line);
            }
        }
    });

    // Adiciona metadados no início do arquivo
    const idLine = translationName 
        ? `\\id ${ubsCode} ${translationName}`
        : `\\id ${ubsCode}`;
    
    usfmContent.unshift(
        idLine,
        `\\ide UTF-8`,
        `\\h ${shortName}`,
        `\\toc1 ${bookTitle}`,
        `\\toc2 ${shortName}`,
        `\\toc3 ${abbreviation}`,
        `\\mt1 ${bookTitle}`
    );

    // Escreve o conteúdo convertido para o arquivo de destino
    fs.writeFileSync(outputFile, usfmContent.join('\n'), 'utf8');
}

// Parâmetros recebidos
const inputFile = process.argv[2];
const outputFile = process.argv[3];
const translationFile = process.argv[4] || null;

// Verifica se os parâmetros foram fornecidos
if (!inputFile || !outputFile) {
    console.error('Por favor, forneça o nome do arquivo de origem e o nome do arquivo de destino.');
    process.exit(1);
}

// Verifica se o arquivo de origem existe
if (!fs.existsSync(inputFile)) {
    console.error('O arquivo de origem não existe.');
    process.exit(1);
}

// Converte o arquivo para USFM
convertToUSFM(inputFile, outputFile, translationFile);
console.log(`Arquivo convertido com sucesso: ${outputFile}`);
