// import styles from "./Previews.module.scss";
import React from "react";
import {useState, useMemo, useEffect, useRef} from "react";
import {Chip, Tab, Tooltip, Divider, Card, CardMedia, CardContent, IconButton, Box, Typography} from "@mui/material";

import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";

import ReplayIcon from "@mui/icons-material/Replay";
import GifIcon from "@mui/icons-material/Gif";
import ImageIcon from "@mui/icons-material/Image";
import MovieIcon from "@mui/icons-material/Movie";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import FolderIcon from "@mui/icons-material/FolderOpen";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
import Quality from "@mui/icons-material/CameraEnhance";
import InfoIcon from '@mui/icons-material/Info';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import Forward5Icon from '@mui/icons-material/Forward5';

import LoadingButton from "@mui/lab/LoadingButton";

gsap.registerPlugin(GSDevTools);

export const AdPreview = (props) => {
  const {ad, gsdevtools, timestamp, maxFileSize = 150} = props;
  
  const [paused, setPaused] = useState(false);
  const [animationForPauseCurrentTime, setAnimationForPauseCurrentTime] = useState(0);
  const [animationForPauseDuration, setAnimationForPauseDuration] = useState(0);
  const [animationForPause, setAnimationForPause] = useState(null);

  const cachedHTML = `${ad.output.html.url}?r=${timestamp}`

  const [mediaType, setMediaType] = useState("iframe");
  const [mediaSource, setMediaSource] = useState(cachedHTML);
  const [activeConfigTab, setActiveConfigTab] = useState("html,iframe");

  const [animation, setAnimation] = useState(null);

  const adPreviewCard = useRef();
  
  const gsDevContainer = useRef();

  // add gsdevtools listeners
  useEffect(() => {
    if (gsdevtools !== "true") return;

    gsDevContainer.current && (gsDevContainer.current.innerHTML = '')

    const ifr = adPreviewCard.current

    // have to use onload in order to set events to the right element (React render thing)
    ifr.onload = () => {
      if (!ifr.contentWindow) return
      const setAnim = e => setAnimation(e.detail)
      ifr.contentWindow.addEventListener("getMainTimeline", setAnim)
      ifr.contentWindow.dispatchEvent(new CustomEvent("previewReady"))
      return () => ifr.contentWindow.removeEventListener("getMainTimeline", setAnim)
    }
  }, [mediaSource])

  // create devtools box with animation
  useEffect(() => {
    if (!animation) return

    animation.pause(0);
    const tl = gsap.timeline();
    tl.to(animation, { duration: animation.totalDuration(), totalProgress: 1, ease: Linear.easeNone });
    gsDevContainer.current && (gsDevContainer.current.innerHTML = '')
    GSDevTools.create({
      container: gsDevContainer.current,
      animation: tl,
      visibility: "visible",
      globalSync: false
    });
  }, [animation])

  const extensionTypes = ["jpg,img", "mp4,video", "gif,img"];
  const extensionIcons = {
    html: "",
    zip: <FolderZipIcon />,
    jpg: <ImageIcon />,
    mp4: <MovieIcon />,
    gif: <GifIcon />,
  };

  useEffect(() => {
    const [type, mediaType] = activeConfigTab.split(",");
    setMediaType(mediaType);

    if (type === "html") {
      setMediaSource(cachedHTML);
    } else {
      setMediaSource(ad.output[type].url);
    }
  }, [activeConfigTab]);

  function reload() {
    activeConfigTab === "html,iframe" ? (adPreviewCard.current.src = cachedHTML) : setActiveConfigTab("html,iframe");
    setPaused(false)
    setAnimationForPauseCurrentTime(0)
    setAnimationForPause(undefined)
    setAnimation(undefined)
  }

  // reload all
  useEffect(() => {
    const reloadAll = event => {
      if (event.key == 'r') {
        reload()
      }
    }

    window.addEventListener('keydown', reloadAll)
    return () => window.removeEventListener("keydown", reloadAll);
  }, [])

  // skip all
  useEffect(() => {
    const arrowRightClick = event => {
      if (event.key == 'ArrowRight') {
        if (!animationForPause) return
        animationForPause.progress(1)
      }
    }
    window.addEventListener('keydown', arrowRightClick)
    return () => window.removeEventListener('keydown', arrowRightClick)
  }, [animationForPause])

  // seek 250ms
  function seek() {
    if (!animationForPause) return
    setPaused(true)
    animationForPause.seek(animationForPause.time() + 0.25, false)
  }

  useEffect(() => {
    const dotClick = event => {
      if (event.key == '.') {
        if (!animationForPause) return
        seek()
      }
    }
    window.addEventListener('keydown', dotClick)
    return () => window.removeEventListener('keydown', dotClick)
  }, [animationForPause])

  // read spacebar pause press
  useEffect(() => {
    const pauseAll = event => {
      if (event.key == ' ' && gsdevtools !== 'true') {
        event.preventDefault()
        setPaused(x => !x)
      }
    }

    window.addEventListener('keydown', pauseAll)
    return () => window.removeEventListener("keydown", pauseAll);
  }, [])
  
  // add play/pause listeners
  useEffect(() => {
    if (gsdevtools == "true") return; // skip if gsdevtools present

    const ifr = adPreviewCard.current

    // have to use onload in order to set events to the right element (React render thing)
    ifr.onload = () => {
      if (!ifr.contentWindow) return
      const setAnim = e => setAnimationForPause(e.detail)
      ifr.contentWindow.addEventListener("getMainTimeline", setAnim)
      ifr.contentWindow.dispatchEvent(new CustomEvent("previewReady"))
      return () => ifr.contentWindow.removeEventListener("getMainTimeline", setAnim)
    }
  }, [mediaSource])

  useEffect(() => {
    if (!animationForPause) return
    setAnimationForPauseDuration(animationForPause.duration())
    setAnimationForPauseCurrentTime(animationForPause.time())
    const onComplete = animationForPause.eventCallback('onComplete')
    animationForPause.eventCallback('onComplete', () => {
      onComplete && onComplete()
      setPaused(true)
    })
    const onUpdate = animationForPause.eventCallback('onUpdate')
    animationForPause.eventCallback('onUpdate', () => {
      onUpdate && onUpdate()
      setAnimationForPauseCurrentTime(animationForPause.time())
    })
  }, [animationForPause])

  useEffect(() => {
    if (!animationForPause) return

    if (paused) animationForPause.pause()
    else {
      if (animationForPause.progress() == 1) {
        reload()
      } else {
        animationForPause.play()
      }
    }
  }, [paused, animationForPause])

  return (
    <Card sx={{minWidth: `${ad.width}px`, maxWidth: `${ad.width}px`, height: "fit-content"}} className="card">
      <Typography sx={{padding: "0px 10px", margin: "10px 0", wordBreak: "break-all"}} align="center" variant="body2">
        {ad.bundleName}
      </Typography>
      <TabContext value={activeConfigTab}>
        <Box sx={{borderColor: "divider"}}>
          <TabList
            variant="fullWidth"
            onChange={(event, newValue) => setActiveConfigTab(newValue)}
            TabIndicatorProps={
              extensionTypes.filter(item => {
                const [extension, type] = item.split(",");
                return ad.output[extension];
              }).length
              ? {}
              : { style:{ display: 'none' } }
            }
          >
            <Tab wrapped sx={{minWidth: "50px"}} label="html" value="html,iframe" />
            {extensionTypes.map((item) => {
              const [extension, type] = item.split(",");
              if (ad.output[extension]) return <Tab key={item} disabled={!ad.output[extension]?.url} icon={extensionIcons[extension]} sx={{minWidth: "50px"}} value={item} />;
            })}
          </TabList>
        </Box>
      </TabContext>

      <CardMedia ref={adPreviewCard} component={mediaType} scrolling="no" style={{width: ad.width, height: ad.height}} height={ad.height} width={ad.width} src={mediaSource} id={ad.bundleName} className={ad.bundleName} frameBorder="0" autoPlay controls />
      <CardContent>
        {
          gsdevtools === "true" && animation !== null && activeConfigTab.split(",")[0] === "html"
          ? <>
              <Box ref={gsDevContainer}></Box>
              <Divider light sx={{margin: "20px 0"}} />
            </>
          : <></>
        }
        {
          gsdevtools !== 'true' && animationForPause !== null && activeConfigTab === "html,iframe" && !ad.controlsOff
          ? <>
              <Box marginBottom="20px" display="flex" flexWrap="wrap" gap="10px" justifyContent="space-between" alignItems="center" className="controls">
                <Box>
                  <Tooltip title="▶／❚❚">
                    <IconButton
                      onClick={() => {
                        setPaused(!paused)
                      }}
                      color="primary"
                    >
                      {paused ? <PlayCircleIcon /> : <PauseCircleIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Seek to the end">
                    <IconButton
                      onClick={() => {
                        animationForPause?.progress(1)
                      }}
                      color="primary"
                    >
                      <SkipNextIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Seek 250ms">
                    <IconButton
                      onClick={() => seek()}
                      color="primary"
                    >
                      <Forward5Icon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography>
                  {animationForPauseCurrentTime.toFixed(2)} / {animationForPauseDuration.toFixed(2)}s
                </Typography>
              </Box>
              <Divider light sx={{margin: "20px 0"}} />
            </>
          : <></>
        }
        {
          ad.output?.zip?.size || ad.output?.unzip?.size || ad.quality
          ? <>
              <Box marginBottom="20px" display="flex" flexWrap="wrap" gap="10px" justifyContent="space-evenly" className="chips">
                {
                  ad.output?.zip?.size
                  ? <Tooltip title={`Compressed size: ${(ad.output.zip.size / 1024).toFixed(1)} KB`}>
                      <Chip icon={<FolderZipIcon />} label={`${Math.floor(ad.output.zip.size / 1024)} KB`} color={ad.output.zip.size / 1024 <= maxFileSize ? "success" : "error"} />
                    </Tooltip>
                  : <></>
                }
                {
                  ad.output?.unzip?.size
                  ? <Tooltip title={`Uncompressed size: ${(ad.output.unzip.size / 1024).toFixed(1)} KB`}>
                      <Chip icon={<FolderIcon />} label={`${Math.floor(ad.output.unzip.size / 1024)} KB`} color={ad.output.unzip.size / 1024 <= maxFileSize ? "success" : "error"} />
                    </Tooltip>
                  : <></>
                }
                {
                  ad.quality && gsdevtools === "true"
                  ? <Tooltip title="Asset quality" className="quality">
                      <Chip icon={<Quality />} label={`${ad.quality}`} color={ad.quality > 85 ? "success" : ad.quality > 70 ? "warning" : "error"} />
                    </Tooltip>
                  : <></>
                }
              </Box>
              <Divider light sx={{margin: "20px 0"}} />
            </>
          : <></>
        }
        {
          gsdevtools === "true" && ad.info
          ? <>
              <Box marginBottom="20px" display="flex" flexWrap="wrap" gap="10px" justifyContent="flex-start" className="chips">
                {
                  Object.entries(ad.info).map(([name, value]) => {
                    return <Tooltip title={name} key={name}>
                      <Chip icon={<InfoIcon />} label={value} color={"info"} />
                    </Tooltip>
                  })
                }
              </Box>
              <Divider light sx={{margin: "20px 0"}} />
            </>
          : <></>
        }
        <Box display="flex" flexWrap="wrap" justifyContent="space-between">
          <Box>
            <Tooltip title="Reload">
              <IconButton
                onClick={() => { reload() }}
                color="primary"
              >
                <ReplayIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open in new window">
              <IconButton onClick={() => window.open(ad.output.html.url)} color="primary">
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box>
            <Box display="flex" flexWrap="wrap">
              {Object.keys(ad.output).map((extension) => {
                if (ad.output[extension] && ad.output[extension].url && extension != 'html')
                  return (
                    <Tooltip key={extension} title={`Download ${extension.toUpperCase()} ${!ad.output[extension]?.url ? "(loading)" : ""}`}>
                      <span>
                        <IconButton disabled={!ad.output[extension]?.url} onClick={(e) => (window.location.href = ad.output[extension]?.url)} color="primary">
                          {extensionIcons[extension]}
                        </IconButton>
                      </span>
                    </Tooltip>
                  );
              })}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
