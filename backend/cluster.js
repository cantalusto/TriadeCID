// === PILAR: DISPONIBILIDADE — BALANCEAMENTO DE CARGA ===
// O Node.js roda em single-thread. Se um request pesado travar o event loop,
// TODOS os outros clientes ficam esperando. A solução é o módulo `cluster`:
// o processo "primário" faz fork de N workers (um por núcleo da CPU) e o
// kernel distribui as conexões TCP entre eles — um balanceador de carga
// nativo, em processo.
//
// Bônus: se um worker crashar por qualquer motivo, respawn automático.
// Em produção você colocaria ainda um NGINX/HAProxy na frente de múltiplas
// máquinas — a mesma ideia em outra escala.

const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const workers = Math.max(2, os.cpus().length);
  console.log(
    `[primary ${process.pid}] iniciando ${workers} workers (CPUs: ${os.cpus().length})`
  );

  for (let i = 0; i < workers; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.warn(
      `[worker ${worker.process.pid}] morreu (${signal || code}). Respawn...`
    );
    cluster.fork();
  });
} else {
  require('./server');
}
