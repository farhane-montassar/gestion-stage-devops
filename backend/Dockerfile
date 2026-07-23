FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Dossiers d'upload + droits d'écriture pour l'utilisateur non-root "node".
# Lors du 1er montage, le volume nommé hérite de ce contenu et de ces droits.
RUN mkdir -p /app/uploads/cv /app/uploads/logos \
    && chown -R node:node /app/uploads

EXPOSE 5000

# Sécurité : ne pas exécuter le processus Node en root.
USER node

CMD ["npm", "start"]