const fs = require('fs');

// Função para verificar se algum marcador da linha está presente nos parâmetros
function hasMarker(line, markers) {
  const markerPattern = /\{([^\}]+)\}/; // Regex para capturar o conteúdo entre chaves
  const match = line.match(markerPattern);

  if (!match) return true; // Linha sem marcador, deve ser incluída
  const lineMarkers = match[1].split('|'); // Separa os marcadores da linha por "|"

  // Verifica se algum dos marcadores passados como parâmetro está presente na linha
  return markers.some(marker => lineMarkers.includes(marker));
}

// Função principal
function processFile(sourceFile, destinationFile, markers) {
  const sourceContent = fs.readFileSync(sourceFile, 'utf8');
  const lines = sourceContent.split('\n');

  const filteredLines = lines.filter(line => hasMarker(line, markers));

  const cleanedLines = filteredLines.map(line => line.replace(/\{[^\}]+\}/g, '')); // Remove os marcadores do texto

  fs.writeFileSync(destinationFile, cleanedLines.join('\n'), 'utf8');
  console.log(`Arquivo ${destinationFile} gerado com sucesso!`);
}

// Pega os parâmetros da linha de comando
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Uso: node gera_arquivo_destino.js <arquivo_origem> <arquivo_destino> <marcadores...>');
  process.exit(1);
}

const [sourceFile, destinationFile, ...markers] = args;

// Chama a função principal
processFile(sourceFile, destinationFile, markers);
