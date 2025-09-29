Quick start


1. Install system dependencies (Linux example, Debian/Ubuntu):
sudo apt update
sudo apt install -y build-essential libvips-dev libheif-dev


(On other OSes: follow sharp installation docs: https://sharp.pixelplumbing.com/install )


2. Install node dependencies:
npm install


3. Copy .env.example to .env and edit if needed:
cp .env.example .env


4. Run server:
npm run dev # requires nodemon
or
npm start


5. Convert via curl:
curl -X POST -F "image=@/path/to/file.heic" http://localhost:3000/convert --output out.jpg


6. (Optional) If using behind nginx, proxy_pass to this server. Provide an example nginx snippet below.


Nginx location snippet:


location /convert/ {
proxy_pass http://127.0.0.1:3000/convert;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_read_timeout 120s;
}
*/
