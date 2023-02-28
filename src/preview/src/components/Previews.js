import React from "react";
import styles from "./Previews.module.scss";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { ListSubheader, Box, Chip, FormControl, InputLabel, Card, CardMedia, CardContent, Button, Select, MenuItem, Typography, Stack, Pagination, TablePagination, AppBar, Toolbar, Checkbox, ListItemText, OutlinedInput } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";

import { AdPreview } from "./AdPreview";

const paginate = (array, page_size, page_number) => {
  return array.slice((page_number - 1) * page_size, page_number * page_size);
};

const getFiltersFromAds = (ads, searchParams) => {
  // returns array with all the filtergroup arrays containing all the unique filters
  // it also initially sets the filters based on the searchparams
  let filterGroups = [];
  ads.forEach((ad) => {
    const bundleSplits = ad.bundleName.split("_");

    bundleSplits.forEach((bundleSplit, index) => {
      if (!filterGroups[index]) filterGroups[index] = [];
      filterGroups[index].push(bundleSplit);
    });
  });

  filterGroups = filterGroups.map((filterGroup) => [...new Set(filterGroup)]); // make them all unique

  // get the initial filter(s) from the searchParams ?filter=hk,en;friendsfamily;160x600
  const searchParamsArray = searchParams.get("filter")
    ? searchParams
        .get("filter")
        .split(";")
        .map((filterGroup) => filterGroup.split(","))
    : [];

  return filterGroups.map((filterGroup) => {
    return filterGroup.map((filter) => {
      return {
        value: filter,
        selected: searchParamsArray.flat().includes(filter),
      };
    });
  });
};

const composeSearchParamsFromFilters = (filters) => {
  return filters
    .map((filterGroup) => {
      return filterGroup
        .filter((filter) => filter.selected)
        .map((filter) => filter.value)
        .join(",");
    })
    .filter((filterGroup) => filterGroup.length > 0)
    .join(";");
};

const getAdsListFromFilters = (adsList, filters) => {
  return adsList.filter((ad) => {
    // en_friendsfamily_ill_300x250
    return ad.bundleName.split("_").every((bundleSplit, index) => {
      const isFilteringOnGroup = filters[index].filter((filter) => filter.selected).length > 0; // if any of the 'selected' keys are true in these objects, it means we're filtering on that group.

      if (isFilteringOnGroup) {
        const [filterValue] = filters[index].filter((filter) => filter.value === bundleSplit).map((filter) => filter.selected);
        return filterValue;
      } else {
        return true; // if we're not filtering on this group, all keys in this group are allowed (because no specific filter is selected in that group)
      }
    });
  });
};

const getLabelFromFilterGroup = (filterGroup) => {
  if (filterGroup.every((filter) => filter.value.match(/[0-9]+x[0-9]+/i))) return "Dimensions"; // if it matches dimensions, like 300x500 ;
  if (filterGroup.every((filter) => filter.value.match(/^[a-z]{2}$/i))) return "Language"; // if string is 2 chars long and a-z or A-Z
  return "Category";
};

export default function Previews({ data }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [ads, setAds] = useState([]);
  const [filters, setFilters] = useState(getFiltersFromAds(data.ads, searchParams));

  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setAds(getAdsListFromFilters(data.ads, filters));
    setSearchParams({
      filter: decodeURI(composeSearchParamsFromFilters(filters)),
    });
    setPage(0);
  }, [filters]);

  const getSelectedFilters = () => {
    // returns flat array of selected filters i.e. ["en","300x400"] (the input element needs this as a value)
    return filters
      .flat()
      .filter((filter) => filter.selected)
      .map((filter) => filter.value);
  };

  const handleChangeFilter = (event) => {
    // make deep copy of filters state
    let updatedFilters = JSON.parse(JSON.stringify(filters));

    // set each filter's selected value based on the value from the event
    updatedFilters.flat().forEach((filter) => {
      filter.selected = event.target.value.includes(filter.value);
    });

    setFilters(updatedFilters);
  };

  function handleFilterDelete(e, value) {
    let updatedFilters = JSON.parse(JSON.stringify(filters));

    // set each filter's selected value based on the value from the event
    updatedFilters.flat().forEach((filter) => {
      if (filter.value === value) {
        console.log("found the one to be deleted");
        console.log(filter);
        filter.selected = false;
      }
    });

    setFilters(updatedFilters);
  }

  // handle button(s)

  const handleDownloadZips = (event) => {
    console.log(event);
    window.open("all.zip");
  };

  // handle pages
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setItemsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const pageAds = useMemo(() => {
    return paginate(ads, itemsPerPage, page + 1);
  }, [page, itemsPerPage, ads]);

  // generate page
  return (
    <>
      <AppBar position="sticky">
        <Toolbar className={styles.toolbar}>
          <Typography align="left" variant="h5" component="div">
            Preview
          </Typography>

          {/*<img src={"logo.png"}></img>*/}

          <FormControl sx={{ m: 1, minWidth: 150, maxWidth: "40%" }}>
            <InputLabel id="demo-multiple-chip-label">Filters</InputLabel>
            <Select
              labelId="demo-multiple-chip-label"
              id="demo-multiple-chip"
              multiple
              value={getSelectedFilters()}
              onChange={handleChangeFilter}
              input={<OutlinedInput id="select-multiple-chip" label="Chip" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip onDelete={(e) => handleFilterDelete(e, value)} key={value} label={value} deleteIcon={<CancelIcon onMouseDown={(event) => event.stopPropagation()} />} />
                  ))}
                </Box>
              )}
            >
              {filters
                .filter((filterGroup) => filterGroup.length > 1) // only show filtergroups with more than 1 filter
                .map((filterGroup, filterGroupIndex) => [
                  <ListSubheader>{getLabelFromFilterGroup(filterGroup)}</ListSubheader>,
                  filterGroup.map((filter, filterIndex) => (
                    <MenuItem key={filter.value} value={filter.value}>
                      {filter.value}
                    </MenuItem>
                  )),
                ])}
            </Select>
          </FormControl>
          <TablePagination labelRowsPerPage="Ads per page:" component="div" count={ads.length} page={page} onPageChange={handleChangePage} rowsPerPage={itemsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />
          <Button onClick={handleDownloadZips} color="inherit">
            Download Zips
          </Button>
        </Toolbar>
      </AppBar>

      <div className={styles.previews}>
        {pageAds.length > 0 && pageAds.map((ad) => <AdPreview key={ad.bundleName} ad={ad} maxFileSize={data.maxFileSize} />)}
        {pageAds.length < 1 && "No ads found with the current combination of filters"}
      </div>
    </>
  );
}
