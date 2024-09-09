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

import LoadingButton from "@mui/lab/LoadingButton";

gsap.registerPlugin(GSDevTools);

export const AdPreview = (props) => {
  const {ad, gsdevtools, timestamp, maxFileSize = 150} = props;

  const cachedHTML = `${ad.output.html.url}?r=${timestamp}`

  const [mediaType, setMediaType] = useState("iframe");
  const [mediaSource, setMediaSource] = useState(cachedHTML);
  const [activeConfigTab, setActiveConfigTab] = useState("html,iframe");

  const [animation, setAnimation] = useState();

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
      ifr.contentWindow.addEventListener("getMainTimeline", e => setAnimation(e.detail), false)
      ifr.contentWindow.dispatchEvent(new CustomEvent("previewReady"))
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
          gsdevtools === "true" && animation && activeConfigTab.split(",")[0] === "html"
          ? <>
              <Box ref={gsDevContainer}></Box>
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
                onClick={(e) => {
                  activeConfigTab === "html,iframe" ? (adPreviewCard.current.src = cachedHTML) : setActiveConfigTab("html,iframe");
                }}
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
