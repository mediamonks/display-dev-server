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
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";

import LoadingButton from "@mui/lab/LoadingButton";

export const AdPreview = (props) => {
  const {ad, maxFileSize = 150} = props;

  const [mediaType, setMediaType] = useState("iframe");
  const [mediaSource, setMediaSource] = useState(ad.output.html.url);
  const [activeConfigTab, setActiveConfigTab] = useState("html,iframe");

  const adPreviewCard = useRef();

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
      setMediaSource(ad.output.html.url);
    } else {
      setMediaSource(ad.output[type].url);
    }
  }, [activeConfigTab]);

  return (
    <Card sx={{minWidth: `${ad.width}px`, maxWidth: `${ad.width}px`, height: "fit-content"}}>
      <Typography sx={{padding: "0px 10px", margin: "10px 0", wordBreak: "break-all"}} align="center" variant="body2">
        {ad.bundleName}
      </Typography>
      <TabContext value={activeConfigTab}>
        <Box sx={{borderColor: "divider"}}>
          <TabList variant="fullWidth" onChange={(event, newValue) => setActiveConfigTab(newValue)}>
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
        <Box>
          <Box marginBottom="20px">
            <Typography sx={{marginBottom: "10px"}} noWrap align="left" variant="body2">
              Bundle size:
            </Typography>
            <Tooltip title="Bundle size">
              <Chip icon={Math.round(ad.output.zip.size / 1024) <= maxFileSize ? <DoneIcon /> : <ClearIcon />} label={`${Math.round(ad.output.zip.size / 1024)} KB`} color={Math.round(ad.output.zip.size / 1024) <= maxFileSize ? "success" : "error"} />
            </Tooltip>
          </Box>
          {/*<Box>
            <Typography sx={{ marginBottom: "10px" }} variant="body2">
              Optimizations:
            </Typography>
            <Tooltip title="Optimizations">
              <Box display="flex" flexWrap="wrap" gap="5px">
                <Chip icon={ad.output.html.optimizations.image ? <DoneIcon /> : <ClearIcon />} label="Images" />
                <Chip icon={<DoneIcon />} label="Fonts" />
                <Chip icon={ad.output.html.optimizations.js ? <DoneIcon /> : <ClearIcon />} label="Code" />
              </Box>
            </Tooltip>
          </Box>*/}
        </Box>

        <Divider light sx={{margin: "20px 0"}} />

        <Box display="flex" flexWrap="wrap" justifyContent="space-between">
          <Box>
            <Tooltip title="Reload">
              <IconButton
                onClick={(e) => {
                  activeConfigTab === "html,iframe" ? (adPreviewCard.current.src = ad.output.html.url) : setActiveConfigTab("html,iframe");
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
                if (ad.output[extension] && extension != 'html')
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
