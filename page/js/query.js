const addr = "10.213.2.124";

function query(){
  val key = document.getElementById("inputField").value;
  console.log(key);
  new Promise((resolve, reject) => {
    request("http://" + addr + "/postcode?code=" + value,
    function(err, status, body){
      console.log(err);
      console.log(status);
      console.log(body);
      if(err){
        reject(err);
      }
      if(status.statusCode !== 200){
        reject("bad query" + status.statusCode);
      }
      data = JSON.parse(body).result;
      resolve(data);
    })
  }).then((data) => {
    document.getElementById("results").value = printBusses(data, "<br/>");
  }).catch(err => {
    console.log(err);
    document.getElementById("results").value = "BAD!"
  });
}

function printBusses(list, sep){
  var result = "";
  if(list.id == 0){
    for(var busListIndex in list){
      if(busListIndex == "id"){
        continue;
      }
      result += printBusses(list[busListIndex], sep);
    }
    return result;
  }
  for(var busIndex in list){
    if(busIndex == "id"){
      continue;
    }
    result += printBus(list[busIndex]) + sep;
  }
  return result; 
}

function printBus(bus){
  return "asd";
}
