const { ipcRenderer } = require('electron');
const fs = require('fs')

document.getElementById('open').addEventListener('click', () =>{
  ipcRenderer.send('file-request');
});


ipcRenderer.on('file', (event, file) => {
  let graphText = fs.readFileSync(file, 'utf-8');
  keyboardInput.value = graphText;
  addGraphByInput();
});


document.getElementById('save').addEventListener('click', ()=>{
    ipcRenderer.send('file-save', keyboardInput.value);
})


/**
 * - Thêm đỉnh
 * - Xóa đỉnh
 * - Thay đổi tên đỉnh
 * - Di chuyển đỉnh
 * - Check đỉnh chạm viền
 * - Đỉnh tự đặt tên hoặc tăng dần theo thứ tự
 * - Thêm cung 
 * - Xóa cung 
 * - Di chuyển cung theo đỉnh 
 * - Button clear toàn bộ đồ thị
 */

/**
 * Thứ tự làm việc
 * Thêm đỉnh vào graph trước (logic trước)
 * Rồi mới hiển thị (giao diện sau).
 * Rồi mới thêm các eventListener sau cùng
 */

/**
 * Giải thuật chính
 * - Chu trình đơn chứa tất cả các cạnh của đồ thị được gọi là chu trình Euler.
 *    (Chu trình đơn là chu trình không đi qua cạnh nào quá 1 lần).
 * - Đường đi đơn chứa tất cả các cạnh của đồ thị được gọi là đường đi Euler.
 * - Một đồ thị có chu trình Euler được gọi là đồ thị Euler.
 * - Một đồ thị có đường đi Euler được gọi là đồ thị nửa Euler.
 * 
 * + Định lí 1:
 *    - Một đồ thị vô hướng liên thông G=(V,E) có chu trình Euler 
 *      khi và chỉ khi mọi đỉnh của nó đều có bậc chẵn. 
 * + Định lí 2:
 *    - Một đồ thị có hướng liên thông yếu G=(V,E) có chu trình Euler
 *      thì mọi đỉnh của nó có bán bậc ra bằng bán bậc vào.
 * 
 * -------------------------------
 * 
 * Sử dụng giải thuật Fleury, đơn giản nhất có thể phát biểu như sau:
 *  Xuất phát từ một đỉnh, ta đi tùy ý theo các cạnh, tuân theo hai nguyên tắc:
 *    + Một là xóa bỏ cạnh vừa đi qua.
 *    + Hai là chỉ chọn đi vào cạnh "một đi không trở lại" nếu như 
 *      không còn cạnh nào khác để chọn. Việc kiểm tra một cạnh (u,v)
 *      có phải là cạnh "một đi không trở lại" hay không có thể thực hiện
 *      bằng cách: Thử xóa cạnh đó đi rồi dùng BFS để tìm 
 *      đường đi từ v tới u, nếu không tìm được thì cạnh đó 
 *      chắc chắn là cạnh "một đi không trở lại".
 */

const keyboardInput = document.getElementById('keyboard-input'); 

const indexLabel = document.querySelector("#index-label"); // Đánh số theo thứ tự
const customLable = document.querySelector("#custom-lable"); // Tên tự đặt
var isCustomLabel = false; // Mặc định khi tạo đỉnh sẽ đánh số

const bfs = document.getElementById('bfs');
const euler = document.getElementById('euler');

const gr = document.querySelector(".graph");
const svg = document.querySelector(".graph>svg");
const warning = document.getElementById("warning");

var activeColor = "#ffe5d9"; // Màu khi được chọn
var defaultColor = "rgba(216, 244, 216, 0.395)"; // Màu khi không được chọn

var isDownMouse = false;
var edge = new Object();
edge.isAdding =false;

const r = 20;
const alpha = -70*Math.PI/180;

/**
 * Khoảng cách giữa cách đỉnh
 */
var offset = 5;
var random = Math.random()*-1 + 1;

/**
 * Đồ thị
 */
var graph = null;

var isInput = false;

/**
 * Trả về tọa độ của một phần tử
 * Cụ thể là main(svg)
 */
var offsets = svg.getBoundingClientRect();
var topSVG = offsets.top;
var leftSVG = offsets.left;
var bottomSVG = offsets.bottom - topSVG;
var rightSVG = offsets.right - leftSVG;


/**
 * Một Vertex - đỉnh của đồ thị
 * + Chỉ số (Giá trị)   VD: 1,2,3,...  -  A,B,C,...
 * + List lưu các đỉnh đề với đỉnh hiện tại
 */
class Vertex {
  /**
   * @param {*} name Tên đỉnh
   * @param {*} x Tọa độ X
   * @param {*} y Tọa độ Y
   * @param {*} r Bán kính
   */
  constructor(name, x, y, r) {
    this.name = name;
    this.neighbors = new Array(); //List lưu các đỉnh kề

    this.x = x;
    this.y = y;
    this.r = r;
  }

  // ----- Phần logic ------

  /**
   * Thêm một đỉnh vào danh sách các đỉnh kề
   * @param {*} vertex Một đỉnh
   */
  addNeighbor(vertex) {
    this.neighbors.push(vertex);
  }

  /**
   * Xóa một đỉnh khỏi danh sách kề (chỉ xóa 1 đỉnh duy nhất)
   * @param {*} vertex Một đỉnh
   * @returns Đỉnh đã xóa
   */
  removeNeighbor(vertex) {
    const index = this.neighbors.indexOf(vertex);
    if (index > -1) {
      this.neighbors.splice(index, 1);
      return vertex;
    }
  }

  /**
   * Lấy danh sách các đỉnh kề
   * @returns Danh sách các đỉnh kề
   */
  getNeighbors() {
    return this.neighbors;
  }
  /**
   * Phương thức đặt tên cho đỉnh
   */
  setName(name) {
    this.name = name;
  }

  /**
   * Tính bậc của một đỉnh
   * @returns Bậc của đỉnh
   */
  degree(){
    let d = 0, din=0, dout=0;
      // Bậc của đỉnh trong đồ thị vô hướng là số các cạnh kề
      // Khi có khuyên => đỉnh sẽ tăng lên 2 bậc 
      this.neighbors.forEach((ner)=>{
        if(this.name===ner.name){ // Khuyên
          d+=2;
        }else d++;
      })
      return d;
  }

  /**
   * Phương thức kiểm tra một đỉnh u có kề với đỉnh hiện tại không
   * @param {Vertex} vertex Đỉnh cần kiểm tra
   * @returns true or false
   */
  isNeighbor(vertex) {
    return this.neighbors.indexOf(vertex) > -1;
  }
  // <----- Kết thúc phần logic ------>

  // <--------- Phần giao diện --------->
  /**
   * Thêm tên cho một đỉnh
   * @param {*} vertex Đỉnh cần thêm
   */
  addNameOfVertex(vertex) {
    // Tạo 1 input để nhập tên đỉnh
    let input = document.createElement("input");
    input.setAttribute("type", "text");
    // Đặt vị trí xuất hiện trùng với nút tròn vừa tạo
    input.style.top = this.y + "px";
    input.style.left = this.x + "px";
    // Nối input vào main
    gr.appendChild(input);
    input.focus();
    //Đặt là hiện đang nhập
    isInput = true;

    // Biến text (Tên đỉnh hiển thị trong nút tròn) có id ban đầu là text
    var stringQuery;
    stringQuery = "#text";
    const text = document.querySelector(stringQuery);

    input.addEventListener("blur", function() {
      // Nếu input rỗng
      if (this.value === "") {
          showWaring(true, "Vui lòng nhập tên đỉnh!");
          this.focus();
      } else {
        vertex.setName(this.value);
        if (graph.isExitInGraph(vertex)) {
          showWaring(true, "Tên đỉnh đã được sử dụng!");
          this.value = "";
          this.focus();
        } else {
          // Hiển thị tên đỉnh người dùng vừa nhập vào ô input
          vertex.updateName(text, this.value);
          vertex.checkVertexInBorder();
          // Đặt id cho text là done đánh dấu đã xong, để lần sau khi get sẽ get những
          // text có id là text như đã tạo
          text.setAttribute("id", "done");
          //Xóa input
          this.remove();
          isInput = false;
          graph.addVertex(vertex);

          // Cập nhật lại đỉnh trên input
          updateInput();
          eventWithVertex();
          warning.innerHTML='';
          return;
        }
      }
    });

    //Khi người dùng nhấn Enter
    input.addEventListener("keypress", function (event) {
      if (event.key === "Enter") this.blur();
    });
  }
  /**
   * Cập nhật lại tên đỉnh 
   * @param {*} element Đỉnh ở DOM
   * @param {*} name Tên mới
   */
  updateName(element, name) {
    element.innerHTML = name;
    element.parentElement.setAttribute("id", "graph-" + name);
  }
  /**
   * Phương thức hiển thị đỉnh lên svg
   * @param {boolean} isIndexLabel Tên đỉnh tự đặt hay không
   */
  drawVertex(isIndexLabel) {
    let isDone = "text";
    var id = '';
    if (isIndexLabel) {
      isDone = "done";
      id = 'id="graph-' + this.name + '"';
    }
    const x =
      `<g transform="translate(${this.x},${this.y})" ${id}>
        <circle fill="white" stroke="black" stroke-width="2px" r="${this.r}"/>
        <text id="${isDone}" stroke="black" stroke-width="0.5px"
        text-anchor="middle" alignment-baseline="central">${this.name}</text>
      </g>`;
    svg.querySelector('#vertex-group').innerHTML += x;

    if(isIndexLabel){
      eventWithVertex();
      // Sau khi vẽ xong cập nhật ở phần input
      updateInput();
    }
  }
  /**
   * Cập nhật lại vị trí của đỉnh
   * @param {*} newX Tọa độ X mới
   * @param {*} newY Tọa độ Y mới
   * @param {*} isInBorder Có phải cập nhật là vì chạm vào biên hay không
   */
  updatePositionOfVertex(newX, newY, isInBorder=true) {
    // Nếu chạm biên nên thêm một khoảng random để các đỉnh tự nhiên hơn
    let offset = isInBorder? random:0;  
    let transition = isInBorder? '0.5s':'0s';  
    let v = document.querySelector("#graph-" + this.name);
    v.setAttribute(
      "transform",
      `translate(${newX + offset}, ${newY + offset})`
    );
    v.style.transition = transition;
    // Cập nhật lại vị trí cho đỉnh
    this.x = newX;
    this.y = newY;
  }
  /**
   * Kiểm tra xem đỉnh có nằm ngoài ranh giới hay không
   */
  checkVertexInBorder() {
    // Xem nếu có vượt quá thì cập nhật lại cung và mũi tên
    let found=0;
    let po = [this.x, this.y];
    //Nếu vượt quá top
    if (this.y - this.r - offset < 0) {
      this.updatePositionOfVertex(this.x, this.y + this.r + offset);
      found=1;
    } else if (this.y + this.r + offset > bottomSVG) {
      this.updatePositionOfVertex(this.x, this.y - this.r - offset);
      found=1;
    } else if (this.x - this.r - offset < 0) {
      this.updatePositionOfVertex(this.x + this.r + offset, this.y);
      found=1;
    }
    if (this.x + this.r + offset > rightSVG) {
      this.updatePositionOfVertex(this.x - this.r - offset, this.y);
      found=1;
    }
    if(found){
      //Cập nhật cung
      this.updatePositionOfEdge(true);
      //Cập nhật khuyên
      this.updatePositionOfRing(po,true);
    }
  }


  /*  Phần cung   */


  /**
   * Hiển thị cung lên SVG
   * @param {*} s1 Đỉnh 1
   * @param {*} s2 Đỉnh 2
   * @param {*} isFinish Đã vẽ xong chưa 
   */
  drawEdge(s1, s2, isFinish = false){
    if(!isFinish){
      let path = document.querySelector("#edge-group");
          path.innerHTML += `
          <g class="g-edge-${s1.name}">
            <path d=" M ${s1.x} ${s1.y} 
                      Q ${s1.x} ${s1.y}
                        ${s1.x} ${s1.y}" 
                stroke-width="2" stroke="black" fill="none" class="edge-${s1.name}" offest="0"/>
          </g>`;
    }else{
      var path = document.querySelector(`.edge-${s1.name}`);
      let gEdge = document.querySelector(`.g-edge-${s1.name}`);
        path.setAttribute("d",
                `M ${s1.x} ${s1.y} 
                  Q ${s1.x} ${s1.y} ${s2.x} ${s2.y}`
        );
        path.setAttribute('class', `edge-${s1.name}-${s2.name}`);
        gEdge.setAttribute('class', `g-edge-${s1.name}-${s2.name}`);
        document.querySelector(`.edge-${s1.name}-${s2.name}`).style.transition = '0s';
    }
    updateInput();
  }

  /**
   * Cập nhật lại vị trí của cung
   * @param {*} isInBorder Có phải vì chạm biên hay không
   */
  updatePositionOfEdge(isInBorder=false){
    let vertex = this;
    let transition = isInBorder? '0.5s':'0s';   

    this.neighbors.forEach(function(v) {       
      let path = document.querySelectorAll(`.edge-${vertex.name}-${v.name}`);
      if(path.length>0){     
        for(const i of path){
          i.setAttribute(
              'd',
              `M ${vertex.x} ${vertex.y} Q ${vertex.x} ${vertex.y} ${v.x} ${v.y}`);
          i.style.transition = transition;
        }
      }
    });
    
    // v là đỉnh kề của đỉnh đang di chuyển (vertex)
    graph.vertexes.forEach(function(v){
      if(v.isNeighbor(vertex)){
        let path = document.querySelectorAll(`.edge-${v.name}-${vertex.name}`);
        if(path.length>0){
          for(const i of path){
            i.setAttribute(
                'd',
                `M ${v.x} ${v.y} Q ${v.x} ${v.y} ${vertex.x} ${vertex.y}`);
            i.style.transition = transition;
          }
        }
      }
    });
  }
  /**
   * Hiển thị cung là khuyên lên SVG
   */
  drawRing(){
    // Tìm một điểm ngẫu nhiên trên đường tròn
    let A = findPointOnCircle(this.x,this.y,this.r);
    if(A[0]===this.x || A[1]===this.y){ 
      A=findPointOnCircle(this.x,this.y,this.r);
    }
    // Thực hiện phép quay tìm điểm thứ 2, qua tâm this, quay 1 góc 30 độ
    let xB = this.x + (A[0]-this.x)*Math.cos(alpha) - (A[1]-this.y)*Math.sin(alpha);
    // NOTE VÌ HỆ TRỤC TỌA ĐỘ CỦA ỨNG DỤNG KHÁC TOÁN HỌC NÊN ĐỔI DẤU CỦA Y Ở VẾ SAU
    //                                                       V
    let yB = this.y + (A[0]-this.x)*Math.sin(alpha) + (A[1]-this.y)*Math.cos(alpha); 
    let nAB = [-(yB-A[1]), xB-A[0]];  // Vector pháp tuyến
    // Thực hiện tịnh tiến hai điểm AB theo vector pháp tuyến nAB(a,b)
    // x=x+a, y=y+b
    const str = `
            <g class="g-edge-${this.name}-${this.name}">
              <path d="M ${A[0]} ${A[1]} C ${A[0]+nAB[0]} ${A[1]+nAB[1]} , ${xB+nAB[0]} ${yB+nAB[1]} , ${xB} ${yB}" 
                    stroke="black" stroke-width="1.8px" fill="transparent"
                    class = "ring-edge-${this.name}-${this.name}"/>`;

    document.querySelector('#edge-group').innerHTML += str;
    updateInput();
    // Vector từ Tâm đến hai đỉnh A, B
    return {A:[A[0]-this.x, A[1]-this.y],
            B: [xB-this.x, yB-this.y]};
  }
  
  updatePositionOfRing(oldPositionOfVertex, isInBorder=false){
    let vertex = this;  
    let A=[-1,-1],B=[-1,-1],pA=[-1,-1],pB=[-1,-1];
    let transition = isInBorder? '0.5s':'0s';
    let edge = document.querySelectorAll(`.ring-edge-${vertex.name}-${vertex.name}`);
    for(let i of edge){
      // Chuỗi trả về thuộc tính d của cung, để ta có thể lấy vị trí cũ của cung
      let d = i.getAttribute('d');
      // M 215 293 C 221 319, 247 313, 241 288
      
      // Sử dụng split() để tách chuỗi -> từ
      let s = d.split(" ");
      A[0]= parseFloat(s[1]);
      A[1]= parseFloat(s[2]);

      B[0]= parseFloat(s[10]);
      B[1]= parseFloat(s[11]);

      pA[0]= parseFloat(s[4]);
      pA[1]= parseFloat(s[5]);      
      
      pB[0]= parseFloat(s[7]);
      pB[1]= parseFloat(s[8]);

      // Vector tịnh tiến tạo bởi tâm cũ và tâm mới của đỉnh;
      let x = vertex.x-oldPositionOfVertex[0];
      let y = vertex.y-oldPositionOfVertex[1];

      // Tịnh tiến các điểm
      A[0] += x;
      A[1] += y;
      B[0] += x;
      B[1] += y;
      pA[0] += x;
      pA[1] += y;
      pB[0] += x;
      pB[1] += y;

      i.setAttribute('d',
        `M ${A[0]} ${A[1]} C ${pA[0]} ${pA[1]} , ${pB[0]} ${pB[1]} , ${B[0]} ${B[1]}`);
      i.style.transition = transition;

      }
  }
}


/**
 * Tạo đồ thị với các đỉnh được lưu trong Map
 * + Map có cặp là key-value:
 *      -Key:       Tên đỉnh
 *      -Value:     Đỉnh dạng Vertex
 *  => Một đồ thị gồm nhiều nút với các (Key(đỉnh) - Value(Ds các đỉnh kề)) được lưu dưới dạng Map
 * + Đồ thị có hướng hay không
 */
class Graph {
  constructor() {
    this.vertexes = new Map(); 
    this.edgeDirection = Graph.UNDIRECTED;  // Đồ thị vô hướng
  }
  /**
   * Thêm một đỉnh vào đồ thị
   * @param {Vertex} Đỉnh
   * @returns Đỉnh vừa thêm, nếu đỉnh đã có trả về đỉnh đã có
   */
  addVertex(v) {
    // Kiểm tra s đã tồn tại
    if (this.vertexes.has(v.name)) {
      return this.vertexes.get(v.name);
    } else {
      // Nếu chưa thì thêm vào
      const vertex = new Vertex(v.name, v.x, v.y, v.r); // Tạo một đỉnh với tên(chỉ số) đỉnh là s
      this.vertexes.set(v.name, vertex); // Thêm đỉnh vừa tạo vào Graph, key là s(chỉ là tên đỉnh),
      return vertex;
    }
  }
  /**
   * Hàm xóa một đỉnh s khỏi Graph
   * @param {Vertex} vertex
   */
  removeVertex(vertex) {
    const s1 = this.vertexes.get(vertex.name); // Trả về đỉnh, nếu không thấy trả về 0
    // Kiểm tra đỉnh s1 có trong graph hay không
    if(s1) {
      // Nếu s1==0 thì if sai, ngược lại if đều đúng
      // Lặp qua các đỉnh trong đồ thị
      // Với từng đỉnh xóa đỉnh s1 khỏi ds các đỉnh kề của đỉnh đó
      this.vertexes.forEach((ver)=>{
        // Xóa toàn bộ các cạnh kề là s1 trong danh sách
        // bằng cách lọc qua danh sách cũ nếu đỉnh khác với đỉnh ta cần xóa thì thêm vào danh sách
        // mới bằng filter
        ver.neighbors = ver.getNeighbors().filter((ner)=> ner!==s1);
      });
    }
    return this.vertexes.delete(vertex.name);
  }

  /**
   * Thêm cung u, v vào đồ thị
   * @param {Vertex} Đỉnh_u
   * @param {Vertex} Đỉnh_v
   * @returns Mảng gồm 2 đỉnh u, v
   */
  addEdge(u, v, isRing = false) {
    const u1 = this.addVertex(u); // Thêm Đỉnh u vào đồ thị
    const v1 = this.addVertex(v); // Thêm Đỉnh v vào đồ thị

    u1.addNeighbor(v1); // Thêm v1 vào danh sách các đỉnh kề của u1
    // Nếu không phải là khuyên. Vì là khuyên chỉ cần thêm 1 lần
    if (!isRing) {
        v1.addNeighbor(u1);
    }
    return [u1, v1];
  }

  /**
   * Xóa cung u,v khỏi đồ thị
   * @param {*} u 
   * @param {*} v
   * @returns Mảng gồm 2 đỉnh u, v
   */
  removeEdge(u, v) {
    // Tương tự như thêm cung
    const u1 = this.vertexes.get(u.name);
    const v1 = this.vertexes.get(v.name);
    if (u1 && v1) { // Nếu đỉnh u1 và v1 đều đã có trong đồ thị
      u1.removeNeighbor(v1);
      v1.removeNeighbor(u1);
    }
    return [u1, v1];
  }

  /**
   * Kiểm tra một đỉnh có thuộc đồ thị hay không
   * @param {*} vertex 
   * @returns true nếu có, false nếu không
   */
  isExitInGraph(vertex) {
    return this.vertexes.has(vertex.name);
  }

  /**
   * Duyệt đồ thị theo chiều rộng sử dụng hàng đợi
   * @param {*} firstVertex Đỉnh bắt đầu duyệt
   * @returns Mảng thứ tự các đỉnh đã duyệt
   */
  bfs(firstVertex=this.vertexes.entries().next().value[1]) {
    // Cho mặc đỉnh là duyệt từ đỉnh đầu tiên của đồ thị
    // Map visited lưu các đỉnh đã được duyệt
    const visited = new Map();
    // Mảng kết quả sau thứ tự các đỉnh sau khi duyệt;
    const result = new Array(); 
    // 1. Khởi tạo Mảng visitList
    const visitList = new Array();

    // 2. Thêm firstVertex vào đầu mảng
    visitList.push(firstVertex);

    // 3. Vòng lặp dùng để duyệt
    while (visitList.length!==0) {
      // Lặp đến khi hàng đợi rỗng

      // 3a. Lấy phần tử ở đầu hàng đợi
      const firstVertex = visitList.shift();
      // Nếu có đỉnh, và đỉnh đó chưa được duyệt
      if (firstVertex && !visited.has(firstVertex.name)) {
        visited.set(firstVertex.name, firstVertex); // Duyệt đỉnh đó -> Thêm vào Map đã duyệt
        result.push(firstVertex);

        // 3b. Xét các đỉnh kề của u, đưa vào hàng đợi visitList
        firstVertex.getNeighbors().forEach(ner => visitList.push(ner));
      }
    }
    return result;
  }


  /**
   * Kiểm tra xem nếu xóa cung u-v thì còn cách nào khác có thể đi từ v về u nữa hay không.
   * @param {*} u 
   * @param {*} v 
   * @returns true nếu có thể và ngược lại
   */
  canGoBack(u, v){
    // Thử xóa cung u-v khỏi đồ thị
    graph.removeEdge(u,v);
    // Nếu có đường đi từ v-u thì có thể quay ngược lại
    let y = graph.bfs(v).indexOf(u)>-1? true:false;
    graph.addEdge(u,v);
    return y;
  }
}

/**
 * Thuật toán tìm chu trình Euler
 * @param {*} graphP 
 * @returns Mảng các chu trình Euler 
 */
function eulerCycle(graphP){
  let newG = new Graph(); 
  // coppy newG từ graphP
  graphP.vertexes.forEach((ver)=>{
    const u1 = newG.addVertex(ver);  // Thêm đỉnh ver vào newG
    ver.getNeighbors().forEach((ner)=>{
      const v1 = newG.addVertex(ner); // Thêm Đỉnh v vào đồ thị
      u1.addNeighbor(v1); // Thêm v1 vào danh sách các đỉnh kề của u1
    });
  });


  // 1. Liên thông
  if(graphP.bfs().length!==graphP.vertexes.size){
    document.getElementById('result').innerHTML = 
    'Không có chu trình Euler do đồ thị không liên thông';
    return;
  }
  // 2. Mọi đỉnh của đồ thị đều có bậc chẵn
  let find=0;
  graphP.vertexes.forEach((ver)=>{
    find += (ver.degree()%2===0)? 0:1;
  });
  if(find!==0){
    if(find==2){
      document.getElementById('result').innerHTML=
        'Đồ thị là đồ thị nửa Euler';
    }else  document.getElementById('result') = 'Đồ thị ko là đồ thị Euler';
    return;
  }


  let nextVertex;  // Đỉnh tiếp theo
  let currentV = newG.vertexes.entries().next().value[1]; // Lấy đỉnh đầu của đồ thị ra duyệt 
  let result=[currentV]; // Thêm đỉnh đó vào stack result
    do{
      nextVertex=0;
      for(let ner of currentV.getNeighbors()){
        nextVertex=ner;
        if(newG.canGoBack(currentV, nextVertex)){break;}
      }
      if(nextVertex!==0){
        newG.removeEdge(currentV, nextVertex);
        result.push(nextVertex);
        currentV=nextVertex;
      }
    }while(nextVertex!==0);
    let str='<br>- ';
    result.forEach(re=>{
      str += `${re.name} `
    })
    document.getElementById('result').innerHTML = 
    `Chu trình Euler:
    ${str}`
}


/**
 * Khi window tạo ra, sẽ tạo mới 1 graph
 */
window.addEventListener("load", () => {
  // Nếu chưa tạo graph (graph===null), thì tạo mới
  if (graph===null) {
      graph = new Graph();
  }
});

function eventWithEdge(){
  // Các path trong phần edge-group
  let childs = document.getElementById('edge-group').childNodes;
  if(childs){
    childs.forEach(function(e){
      // Xóa khi ctrl click vào cung
      e.addEventListener('click', event =>{
        if(event.ctrlKey){
          e.remove();
          let cl = e.getAttribute('class');
          let edges = cl.split('-');
          // ['g', 'edge', tên đỉnh 1, tên đỉnh 2]
          // Từ tên đỉnh lấy ra đỉnh đó trong đồ thị, sau đó xóa cung u, v
          let u = graph.vertexes.get(edges[2]);
          let v = graph.vertexes.get(edges[3]);
          graph.removeEdge(u, v);
          updateInput();
        }
      });
    });
  }
}

/**
 * Di chuyển đỉnh trên svg bằng kéo thả chuột
 */
function eventWithVertex() {
  // Lọc qua toàn bộ đỉnh trong graph và thêm event
  graph.vertexes.forEach(function (value) {
    let v = document.querySelector("#graph-" + value.name);
    v.addEventListener("mouseleave", () => {
      isDownMouse = false;
      value.checkVertexInBorder();
    });

    v.addEventListener("mousedown", () => {
      isDownMouse = true;
    });

    v.addEventListener("mouseup", () => {
      isDownMouse = false;
      value.checkVertexInBorder();
    });
    //Di chuyển đỉnh
    v.addEventListener("mousemove", function (event) {
      // Nếu đang nhấn giữ chuột thì di chuyển đỉnh theo chuột
      if (isDownMouse) {
        let po = [value.x, value.y];
        // Cập nhật đỉnh
        value.updatePositionOfVertex(event.clientX-leftSVG, event.clientY-topSVG, false);
        // Cập nhật lại cung
        value.updatePositionOfEdge();
        //Cập nhật lại khuyên
        value.updatePositionOfRing(po);
      }
    });

    v.addEventListener("click", function (event) {
      if (event.shiftKey) {
        // Thêm cung
        if (edge.isAdding) {
          var path = document.querySelector(`.edge-${edge.s1.name}`);
          edge.s2 = value;
          if (edge.s1 === edge.s2){
            path.remove(); 
            // Nếu click lại vào đỉnh s1 <=> Có khuyên  -> Thêm khuyên
            graph.addEdge(edge.s1, edge.s2, true);
            value.drawRing(graph.edgeDirection);
            eventWithEdge();
            edge.isAdding = false;
            delete edge.s1;
            delete edge.s2;
          } else {
            //Thêm s1, s2 vào graph
            graph.addEdge(edge.s1, edge.s2);
            value.drawEdge(edge.s1, edge.s2, true);
            eventWithEdge();
            //Reset các giá trị cho edge về ban đầu
            edge.isAdding = false;
            delete edge.s1;
            delete edge.s2;
          }
        } else {  // Chưa vẽ xong (mới chọn 1 đỉnh)
          edge.s1 = value;
          value.drawEdge(edge.s1, edge.s2);
          edge.isAdding = true;
        }
      }else if(event.ctrlKey){
        // Xóa đỉnh v trên SVG
        v.remove();
        //Xóa các cung có nối với đỉnh value
        value.neighbors.forEach((ner)=>{
          if(value===ner){  // Khuyên
            document.querySelectorAll(`.g-edge-${ner.name}-${value.name}`)
              .forEach((edge)=>{edge.remove()});
          }  
          // Xóa cung u-v, (có thể u-v đảo ngược thành v-u nên cần xóa 2 chiều)
          document.querySelectorAll(`.g-edge-${value.name}-${ner.name}`)
                .forEach(edge=>edge.remove());
          document.querySelectorAll(`.g-edge-${ner.name}-${value.name}`)
                .forEach(edge=>edge.remove());
        });
        //Xóa ở graph trước
        graph.removeVertex(value);
        // Sau đó cập nhật ở input
        updateInput();
      }
    });
  });
}


/**
 * Cập nhật value input khi đồ thị có thay đổi
 */
function updateInput(){
  let str = '';
  let added = new Array();
  if(graph){
    graph.vertexes.forEach((ver)=>{
      if(ver.getNeighbors().length===0){
        str += ver.name +'\n';
      }else ver.getNeighbors().forEach(ner=>{
        if(graph.edgeDirection===Graph.UNDIRECTED){
          if(added.indexOf(ner)===-1){
            str += ver.name +' '+ ner.name + '\n';
          }
          added.push(ver);  
        }else str += ver.name +' '+ ner.name + '\n';
      });
      
    });
  }
  keyboardInput.value = str.substring(0, str.length - 1) // Bỏ dấu enter ở cuối cùng
}

/**
 * Giải phương trình bậc 2
 * @param {*} a 
 * @param {*} b 
 * @param {*} c 
 * @returns 
 */
function quadraticEquation2(a, b, c){
  var x1,x2;
  var delta;
  delta=(b*b-4*a*c);
  if(delta === 0){
    x1=x2-b/(2*a);
  }
  else if(delta<0){
    return [];
  } 
  else{
    x1=(-b-Math.sqrt(delta))/(2*a);
    x2=(-b+Math.sqrt(delta))/(2*a);
  }
  return [x1,x2];
}

/**
 * Tìm điểm trên đường tròn để vẽ khuyên
 * @param {*} x0 Tâm đường tròn 
 * @param {*} y0 Tâm đường tròn 
 * @param {*} r   Bán kính đường tròn
 * @returns tọa độ một đỉnh thuộc đường tròn
 */
function findPointOnCircle(x0, y0, r){
  // Phương trình đường tròn (x-x0)^2 + (y-y0)^2 = r^2
  // x2 + y2 - 2ax - 2by + c = 0, đk: a2+b2-c>0
  // R = sqrt(a2+b2-c);   => c = a2 + b2 - r2
  // => Cho x là random sau đó tính y 
  // -> y2 - 2by + (x2-2ax+c) = 0
  let max = x0+r;      
  let min = x0-r;
  let x = Math.random() * (max - min + 1) + min;  // x nằm trong khoảng +- r
  let y = quadraticEquation2(1, -2*y0, x*x - 2*x0*x + x0*x0+y0*y0-r*r);
  let i = Math.floor(Math.random()*2);  // Chọn random y[0], hoặc y[1];
  return [x,y[i]];
}

svg.addEventListener("dblclick", function (event) {

  //Vẽ trên svg
  let xVertex = event.clientX - leftSVG;
  let yVertex = event.clientY - topSVG;

  if (!isCustomLabel){
    // Index sẽ tăng dần khi thêm từng node vào
    let index = graph.vertexes.size + 1;
    //Tạo một đỉnh tạm với các thông số, sau đó addVertex() vào graph
    let n = new Vertex(index + "", xVertex, yVertex, r);
    while (graph.isExitInGraph(n)) {
      index++;
      n.setName(index + "");
    }
    graph.addVertex(n);
    n.drawVertex(true);
    n.checkVertexInBorder();
  } else {
    // Kiểm tra xem đã input xong chưa
    if (!isInput) {
      //Tạo một đỉnh tạm với tên đỉnh là rỗng, sau đó addNameOfVertex()
      //addNameOfVertex sẽ tạo 1 input để nhập, sau khi nhập xong
      //sẽ gọi hàm addVertex() để thêm vào grap
      let node = new Vertex('', xVertex, yVertex, r);
      node.drawVertex(false);
      node.addNameOfVertex(node);
    } else {
      showWaring(true, "Vui lòng nhập tên đỉnh!");
    }
  }
});

// Khi đang thêm cung mà nhấn vào svg hoặc leave khỏi thì hủy thêm
svg.addEventListener('click',function(event){
  if(!event.shiftKey){
    if(edge.s1!==undefined){
      document.querySelector(`.edge-${edge.s1.name}`).remove(); 
      edge.isAdding = false;
      delete edge.s1;
      delete edge.s2;
    }
  }
})
svg.addEventListener("mouseleave", () => {
  isDownMouse = false;
  if(edge.s1!==undefined){
    document.querySelector(`.edge-${edge.s1.name}`).remove(); 
    edge.isAdding = false;
    delete edge.s1;
    delete edge.s2;
  }
});


//Vẽ đường thẳng trung gian khi cung chưa xác định được đỉnh thứ hai.
svg.addEventListener("mousemove", function(event){
  let s1 = edge.s1;
  if (edge.isAdding) {
    var path = document.querySelector(`.edge-${s1.name}`);
    path.setAttribute(
      'd',
      `M ${s1.x} ${s1.y} Q ${s1.x} ${s1.y} ${event.clientX - leftSVG} ${event.clientY - topSVG}`);
    path.style.transition = '0s';
  }else{
    if(path!=null){
      path.remove();
    }
  }
});

// Khi thực hiện điền vào Input => Là đỉnh tự chọn
keyboardInput.addEventListener('focus', ()=>customLable.click());
keyboardInput.addEventListener('blur', ()=>{
  addGraphByInput();
});
keyboardInput.addEventListener("keypress",function(event) {
  if(event.key==='Enter'){
    addGraphByInput();
  }
});

/**
 * Chuẩn hóa lại định dạng lại dữ liệu trong khung input
 * @returns mảng các đỉnh cung
 */
function standardizedData(){
  let result = [];
   // Ngắt các đỉnh, cung bằng kí tự xuống dòng
  keyboardInput.value.split('\n').forEach((v)=>{  // => 1 mảng các danh sách đỉnh hoặc cung
    if(v==='') return;
    let ver = v.trim().split(" ");  // Tách hai đỉnh đã nhập bằng các khoảng trắng vd: 2 3
    // Có lúc người dùng nhập 2  3(2 lần khoảng trắng) => biến ver sẽ có giá trị là [2, '', 3]
    // Do bị dư 1 khoảng trắng nên, ta cần bỏ những phần tử rỗng
    ver = ver.filter((v)=>v!=='');      // Lọc chọn những phần tử khác rỗng  
    // Khi đã lọc khoảng trắng nhưng số lượng phần tử vẫn lớn hơn 2 thì có thể do người dùng
    // đã nhập nhiều hơn 2 số, => báo lỗi và return
    if(ver.length>2){ // Báo lỗi khi nhập sai định dạng
      document.getElementById('warning-input').innerHTML='Hãy điền tên 2 đỉnh';
      return;
    }
     // Nếu không có lỗi gì Xóa bỏ cảnh báo
    document.getElementById('warning-input').innerHTML='';
    // Thêm ver, có thể là 1 đỉnh, hoặc 2 đỉnh(biểu diễn 1 cung) và mảng result
    result.push(ver);
  });
  return result;
}




let tempGraph = [];
function addGraphByInput() { 
  // Xóa toàn bộ cung để vẽ lại
  document.querySelector('#edge-group').innerHTML='';
  graph.vertexes.forEach((vertex)=>vertex.neighbors=[]);
  let result = standardizedData();
  if(result.length < tempGraph.length){ // Tức là đã xóa các cung hoặc đỉnh nào đó 
    // Những đỉnh sẽ bị xóa
    // là những đỉnh mà result hiện tại không có, nhưng tempGraph thì có
    let find=0;
    let delVers = [];
    for(let tv of tempGraph){
      find=0;
      for(let rv of result){
        if(tv[0]===rv[0] && tv[1]===rv[1]){
          find++;
          break;
        }
      }
      if(find===0){
        delVers.push(tv);
      }
    } 
    delVers.forEach((ver)=>{
      if(document.querySelector(`#graph-${ver[0]}`)!==null){
        document.querySelector(`#graph-${ver[0]}`).remove();
        const v1 = graph.vertexes.get(ver[0]);
        graph.removeVertex(v1);
      }
      if(document.querySelector(`#graph-${ver[1]}`)){
        document.querySelector(`#graph-${ver[1]}`).remove();
        const v2 = graph.vertexes.get(ver[1]);
        graph.removeVertex(v2);
      }
    });
  }
  tempGraph = result;
  result.forEach((ver)=>{
    // Tạo đỉnh s1 với tọa độ ngẫu nhiên
    var s1 = new Vertex(ver[0], Math.random()*350+50, Math.random()*350+50, r);
    // graph.addVertex(s1) trả về đỉnh vừa thêm, nếu đỉnh đó chưa có trong graph
    // Nên s1 giống với đỉnh được trả về => s1 là đỉnh mới được thêm
    const s11=graph.addVertex(s1);
    if(s11.name===s1.name && s11.x===s1.x && s11.y===s1.y){   // Đỉnh không phải là đỉnh đã có trong đồ thị
      s1.drawVertex(true);
      s1.checkVertexInBorder();
    }
    // Nếu người dùng chỉ thêm 1 đỉnh(=>ver[1] là undefined ) tức là không có cung 
    // nên không cần thêm s2, và cũng cần thêm cung 
    if(ver[1]!==undefined){ 
       // Tạo đỉnh s2
      var s2 = new Vertex(ver[1], Math.random()*350+50, Math.random()*350+50, r);
      const s21 = graph.addVertex(s2);
      // Thêm vào graph
      if(s21.name===s2.name && s21.x===s2.x && s21.y===s2.y){   // Đỉnh không phải là đỉnh đã có trong đồ thị
        s2.drawVertex(true);
        s2.checkVertexInBorder();
      }

      // Thêm cung s1-s2 vào graph
      graph.addEdge(s11, s21);
      if(ver[0]===ver[1]){  // => là khuyên
        s11.drawRing(graph.edgeDirection);
      }else{ // Ngược lại vẽ cung bình thường
        document.getElementById('edge-group').innerHTML+=
        ` <g class="g-edge-${s11.name}-${s21.name}">
            <path d=" M ${s11.x} ${s11.y} 
                  Q ${s11.x} ${s11.y}
                    ${s21.x} ${s21.y}" 
                  stroke-width="2" stroke="black" fill="none"
                  class="edge-${s11.name}-${s21.name}"/>
          </g>`;
      }
      // Cập nhật lại trên iput về những sửa đổi nếu có
      updateInput();
      eventWithEdge();
    }
  });
}


/**
 * Hiển thị thông báo lỗi
 * @param {boolean} Hiển_thị_hay_không
 * @param {*} Thông_báo
 */
function showWaring(isShow, w) {
  if (isShow) {
    warning.style.display = "block";
    warning.textContent = w;
  } else {
    warning.style.display = "none";
    warning.textContent = "";
  }
}
function changeEvent(activated, notActivated) {
  activated.style.backgroundColor = activeColor;
  notActivated.style.backgroundColor = defaultColor;
}

function clearGraph(){
  if(!isInput){
    document.querySelector('#edge-group').innerHTML = '';
    document.querySelector('#vertex-group').innerHTML = '';
    keyboardInput.value='';
    graph=new Graph(); 
  }
}


customLable.addEventListener("click", () => {
  isCustomLabel = true;
  changeEvent(customLable, indexLabel);
});
indexLabel.addEventListener("click", () => {
  isCustomLabel = false;
  changeEvent(indexLabel, customLable);
});


bfs.addEventListener('click',()=>{
  let str='<br>';
  if(graph.vertexes.size===0){
    document.getElementById('result').innerHTML = 'Đồ thị rỗng';
    return;
  }
    let checked=[];// Mảng lưu các đỉnh đã được duyệt
    let result=[];  // Mảng lưu các bộ phận liên thông
    graph.vertexes.forEach(vertex => {
      if(checked.indexOf(vertex)===-1){
        let a = graph.bfs(vertex);  // Trả về 1 bộ phận liên thông 
        checked = checked.concat(a);// Nối các đỉnh từ bộ phận liên thông vào mảng đã duyệt
        result.push(a); // Thêm a vào mảng kết quả (Thêm 1 bộ phận liên thông khác concat là nối)
      }
    });
    result.forEach((v)=>{
      str += `-  `
      v.forEach((vv)=>{str += vv.name + ' '});
      str += '<br>';
    });
  document.getElementById('result').innerHTML = 
    `Các bộ phận liên thông:
    ${str}`
});

euler.addEventListener('click',()=>{
  if(graph.vertexes.size===0){
    document.getElementById('result').innerHTML = 'Đồ thị rỗng';
    return;
  }
  eulerCycle(graph);
});

document.querySelector('#clear-graph').addEventListener('click',()=>clearGraph());

document.querySelectorAll('.btn').forEach((btn)=>{
  btn.addEventListener("mousedown", () => {
    btn.style.backgroundColor = '#f8edeb'
  });
  btn.addEventListener("mouseup", () => {
    btn.style.backgroundColor = 'rgba(216, 244, 216, 0.395)';
  });
})

Graph.UNDIRECTED = Symbol('undirected graph');  // Vô hướng
