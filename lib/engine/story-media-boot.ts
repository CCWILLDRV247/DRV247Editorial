import { LAST_STORY_MEDIA_KEY, STORY_MEDIA_NAME } from "./story-transition";

/** Inline boot: name the last-opened card before the incoming MPA snapshot. */
export const STORY_MEDIA_BOOT_SCRIPT = `(function(){
  var KEY=${JSON.stringify(LAST_STORY_MEDIA_KEY)};
  var NAME=${JSON.stringify(STORY_MEDIA_NAME)};
  function apply(){
    try{
      var id=sessionStorage.getItem(KEY);
      if(!id)return;
      var nodes=document.querySelectorAll("[data-story-media=\\""+id+"\\"]");
      for(var i=0;i<nodes.length;i++){
        nodes[i].style.viewTransitionName=i===0?NAME:"";
      }
    }catch(e){}
  }
  apply();
  window.addEventListener("pagereveal",apply);
})();`;
