import React from "react";
import { Box, Grid, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";
import { keyframes } from "@mui/system";
import { useNavigate } from "react-router-dom"; // ✅ for navigation

// Define keyframes if needed for animations (e.g., flipclock)
const flipAnimation = keyframes`
  // Add animation details if required
`;

function TeenPlay() {
  const navigate = useNavigate(); // If navigation is needed, though not used in this component yet

  // Sample data for last results (from HTML)
  const lastResults = [
    { WonBy: 'Player B', label: 'B' },
    { WonBy: 'Player B', label: 'B' },
    { WonBy: 'Player A', label: 'A' },
    { WonBy: 'Player B', label: 'B' },
    { WonBy: 'Player B', label: 'B' },
    { WonBy: 'Player A', label: 'A' },
    { WonBy: 'Player B', label: 'B' },
    { WonBy: 'Player A', label: 'A' },
    { WonBy: 'Player B', label: 'B' },
    { WonBy: 'Player B', label: 'B' },
  ];

  // Sample bets data (empty as per HTML)
  const tpt20Bets = [];

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px', margin: 'auto', padding: { xs: 1, md: 2 } }}>
      <Box className="game-header header-color" sx={{ color: 'white', padding: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">Teen Patti 20-20</Typography>
        <Typography variant="body1">RoundId: <span id="RoundID">102251011010126</span></Typography>
      </Box>
      <Box sx={{ position: 'relative', width: '100%', height: { xs: '300px', sm: '400px', md: '500px' } }}>
        <Box sx={{ width: '100%', height: '100%', backgroundColor: 'black' }}>
          
        </Box>
        <Box className="flipclock" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <Typography id="Timer" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, color: 'white' }}>0</Typography>
        </Box>
        <Box className="res-box" sx={{ position: 'absolute', bottom: 0, width: '100%', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-around', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, md: 0 } }}>
            <Typography sx={{ mr: 2 }}>Player A</Typography>
            <Box className="rescard andar" sx={{ display: 'flex' }}>
              <img id="C1" className="andar-bahar-image" src="/cards/3DD.png" alt="Card 1" style={{ width: { xs: 40, md: 50 }, height: 'auto' }} />
              <img id="C2" className="andar-bahar-image" src="/cards/5SS.png" alt="Card 2" style={{ width: { xs: 40, md: 50 }, height: 'auto' }} />
              <img id="C3" className="andar-bahar-image" src="/cards/7SS.png" alt="Card 3" style={{ width: { xs: 40, md: 50 }, height: 'auto' }} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ mr: 2 }}>Player B</Typography>
            <Box className="rescard bahar" sx={{ display: 'flex' }}>
              <img id="C4" className="andar-bahar-image" src="/cards/ADD.png" alt="Card 4" style={{ width: { xs: 40, md: 50 }, height: 'auto' }} />
              <img id="C5" className="andar-bahar-image" src="/cards/6CC.png" alt="Card 5" style={{ width: { xs: 40, md: 50 }, height: 'auto' }} />
              <img id="C6" className="andar-bahar-image" src="/cards/1.png" alt="Card 6" style={{ width: { xs: 40, md: 50 }, height: 'auto' }} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ background: '#bbbbbb', mt: 2 }}>
        <Grid container spacing={0} className="tp-module">
          <Grid item xs={6} md={6}></Grid>
          <Grid item xs={3} md={3} sx={{ textAlign: 'center' }}>
            <Typography>Back</Typography>
          </Grid>
        </Grid>

        <Grid container spacing={0} className="tp-module" sx={{ background: '#bbbbbb' }}>
          <Grid item xs={6} md={6}>
            <Typography>Player A (<span id="1_position">0</span>)</Typography>
          </Grid>
          <Grid item xs={3} md={3} sx={{ textAlign: 'center', position: 'relative' }}>
            <Typography>0.00</Typography>
            <Typography id="1_position">0</Typography>
            <Box className="susb-bhav" sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="cards/padlock.png" alt="Suspended" style={{ width: '50%' }} />
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={0} className="tp-module" sx={{ background: '#bbbbbb' }}>
          <Grid item xs={6} md={6}>
            <Typography>Player B (<span id="1_position">0</span>)</Typography>
          </Grid>
          <Grid item xs={3} md={3} sx={{ textAlign: 'center', position: 'relative' }}>
            <Typography>0.00</Typography>
            <Typography id="3_position">0</Typography>
            <Box className="susb-bhav" sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="cards/padlock.png" alt="Suspended" style={{ width: '50%' }} />
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box className="game-header header-color" sx={{ color: 'white', padding: 1, mt: 2 }}>
        <Typography sx={{color: 'white'}}>Last Result</Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', background: 'lightGray', color: 'black', padding: 1 }}>
        {lastResults.map((result, index) => (
          <Box
            key={index}
            sx={{
              background: result.label === 'A' ? 'green' : 'red',
              color: 'white',
              borderRadius: '50%',
              width: { xs: 20, md: 24 },
              height: { xs: 20, md: 24 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 0.5,
              mb: 0.5,
            }}
          >
            <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '1rem' } }}>{result.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box className="numeric-keypad-main-div-session" sx={{ padding: 0, mt: 2 }}>
        <Grid container spacing={1} alignItems="center" justifyContent="center">
          <Grid item xs={12} sm={3}>
            <Typography>Amount</Typography>
          </Grid>
          <Grid item xs={12} sm={5} sx={{ color: 'black'}}>
            <TextField
              id="MatchAmount"
              type="number"
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button variant="contained" color="secondary" disabled id="cmdDone" fullWidth>
              DONE
            </Button>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell colSpan={4} sx={{ background: 'lightgray', textAlign: 'center' , color: "black" }}>
                MATCH BETS
              </TableCell>
            </TableRow>
            <TableRow >
              <TableCell sx={{ color: "black" }}>TEAM</TableCell>
              <TableCell sx={{ color: "black" }}>RATE</TableCell>
              <TableCell sx={{ color: "black" }}>AMOUNT</TableCell>
              <TableCell sx={{ color: "black" }}>MODE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tpt20Bets.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', color: "black" }}>
                  No bets
                </TableCell>
              </TableRow>
            )}
            {/* Add dynamic rows if needed */}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default TeenPlay;