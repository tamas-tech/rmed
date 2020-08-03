var QueryString=function(){var query_string={};var query=window.location.search.substring(1);var vars=query.split("&");for(var i=0;i<vars.length;i++){var pair=vars[i].split("=");if(typeof query_string[pair[0]]==="undefined"){query_string[pair[0]]=pair[1];}else if(typeof query_string[pair[0]]==="string"){var arr=[query_string[pair[0]],pair[1]];query_string[pair[0]]=arr;}else{query_string[pair[0]].push(pair[1]);}}
return query_string;}();function str_replace(search,replace,subject,count){var i=0,j=0,temp='',repl='',sl=0,fl=0,f=[].concat(search),r=[].concat(replace),s=subject,ra=Object.prototype.toString.call(r)==='[object Array]',sa=Object.prototype.toString.call(s)==='[object Array]';s=[].concat(s);if(count){this.window[count]=0;}
for(i=0,sl=s.length;i<sl;i++){if(s[i]===''){continue;}
for(j=0,fl=f.length;j<fl;j++){temp=s[i]+'';repl=ra?(r[j]!==undefined?r[j]:''):r[0];s[i]=(temp).split(f[j]).join(repl);if(count&&s[i]!==temp){this.window[count]+=(temp.length-s[i].length)/f[j].length;}}}
return sa?s:s[0];}
function mktime()
{var d=new Date();var r=arguments;var e=["Hours","Minutes","Seconds","Month","Date","FullYear"];for(var i=0;i<e.length;i++)
{if(typeof r[i]==="undefined")
{r[i]=d["get"+e[i]]();r[i]+=(i===3);}
else
{r[i]=parseInt(r[i],10);if(isNaN(r[i]))
return false;}}
r[5]+=(r[5]>=0?(r[5]<=69?2e3:(r[5]<=100?1900:0)):0);d.setFullYear(r[5],r[3]-1,r[4]);d.setHours(r[0],r[1],r[2]);return(d.getTime()/1e3>>0)-(d.getTime()<0);}
function is_touch_device(){try{document.createEvent("TouchEvent");return true;}catch(e){return 'ontouchstart'in window||'onmsgesturechange'in window;}}
function nl2br(str,is_xhtml){var breakTag=(is_xhtml||typeof is_xhtml==='undefined')?'<br />':'<br>';return(str+'').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g,'$1'+breakTag+'$2');}
function ismsie(){var ua=window.navigator.userAgent;var msie=ua.indexOf("MSIE ");if(msie>0){return true;}else{return false;}}
function inArray(needle,haystack){var length=haystack.length;for(var i=0;i<length;i++){if(haystack[i]==needle)return true;}
return false;}