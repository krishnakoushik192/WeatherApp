const list_data=["USA","SPAIN","FRANCE","INDIA","SRI LANKA"];

const data=list_data.map((country_name)=>{
    if (country_name.toLowerCase()==='india'){
        return true;
    }else{
        return false;
    }
})
console.log(data);